#include "TibetHUD.h"
#include "TibetGameMode.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Canvas.h"
#include "CanvasItem.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "GameFramework/GameUserSettings.h"
#include "GameFramework/PlayerController.h"
#include "TibetCharacter.h"
#include "TibetPlayOverlay.h"
#include "Widgets/SViewport.h"
#include "Widgets/SWindow.h"
#include "Framework/Application/SlateApplication.h"
#include "Fonts/FontMeasure.h"
#include "Misc/App.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "GenericPlatform/GenericApplication.h"

const UFont* ATibetHUD::EnsureCanvasFont()
{
    if (!CanvasFont)
    {
        CanvasFont = NewObject<UFont>(this);
        CanvasFont->FontCacheType = EFontCacheType::Runtime;
    }
    return CanvasFont;
}

void ATibetHUD::BeginPlay()
{
    Super::BeginPlay();
    EnsureCanvasFont();
#if !UE_BUILD_SHIPPING
    FString QA;
    if (FParse::Value(FCommandLine::Get(),TEXT("TibetQA="),QA) && QA==TEXT("Photo")) return;
#endif
    auto* Viewport=GetWorld()->GetGameViewport();
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (!Viewport || !Mode) return;
    const bool Touch=PLATFORM_IOS || FParse::Param(FCommandLine::Get(),TEXT("TibetTouch"));
    Overlay=SNew(STibetPlayOverlay).Mode(Mode).HUD(this).Touch(Touch);
    Viewport->AddViewportWidgetContent(Overlay.ToSharedRef());
    RefreshInputMode();
}

void ATibetHUD::RefreshInputMode()
{
    auto* PC=GetOwningPlayerController();
    auto* Viewport=GetWorld()->GetGameViewport();
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (!Overlay || !PC || !Viewport || !Mode) return;
    PC->SetShowMouseCursor(!Overlay->IsTouch());
    if (IsJournalOpen() || Mode->FeedingPanel())
    {
#if PLATFORM_MAC
        if (FSlateApplication::IsInitialized())
            FSlateApplication::Get().SetHandleDeviceInputWhenApplicationNotActive(true);
#endif
        FInputModeUIOnly Menu;
        Menu.SetWidgetToFocus(Overlay).SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
        PC->SetInputMode(Menu);
    }
    else
    {
#if PLATFORM_MAC
        if (FSlateApplication::IsInitialized())
            FSlateApplication::Get().SetHandleDeviceInputWhenApplicationNotActive(false);
#endif
        // The live HUD is clickable. Only a right-button drag captures the mouse for look.
        FInputModeGameAndUI Play;
        Play.SetWidgetToFocus(Viewport->GetGameViewportWidget()).SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
        PC->SetInputMode(Play);
        Viewport->SetMouseCaptureMode(EMouseCaptureMode::CaptureDuringRightMouseDown);
    }
}

bool ATibetHUD::IsJournalOpen() const
{
    return Page!=ETibetPage::Play;
}

void ATibetHUD::ToggleJournal(ETibetPage Next)
{
    auto* PC=GetOwningPlayerController();
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (!Overlay || !PC || !Mode || Mode->FeedingPanel()!=0) return;
    if (Next==Page || Next==ETibetPage::Play) { CloseJournal(); return; }
    if (!IsJournalOpen())
    {
        if (auto* Pilgrim=Cast<ATibetCharacter>(PC->GetPawn())) Pilgrim->CancelGameplayInput();
        Mode->PauseDialogue(true);
        bPausedByJournal=!PC->IsPaused() && PC->SetPause(true);
    }
    Page=Next;
    Overlay->Show(Page);
    RefreshInputMode();
}

void ATibetHUD::UseQuickSlot()
{
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (!Mode || Mode->FeedingPanel()!=0 || IsJournalOpen()) return;
    if (Mode->QuickItem()==ETibetItem::Map) ToggleJournal(ETibetPage::Map);
    else Mode->UsePill();
}
void ATibetHUD::CloseJournal()
{
    if (!IsJournalOpen()) return;
    Page=ETibetPage::Play;
    if (auto* PC=GetOwningPlayerController())
    {
        if (bPausedByJournal) PC->SetPause(false);
        if (auto* Pilgrim=Cast<ATibetCharacter>(PC->GetPawn())) Pilgrim->CancelGameplayInput();
    }
    if (auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>()) Mode->PauseDialogue(false);
    bPausedByJournal=false;
    if (Overlay) Overlay->Show(Page);
    RefreshInputMode();
}
void ATibetHUD::DrawHUD()
{
    Super::DrawHUD();
    bDrewInteraction = false;
    const auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    const auto* PC=GetOwningPlayerController();
    if(IsJournalOpen() || !Overlay || !Canvas || !PC || !PC->GetPawn() || !M || M->IsCampaignComplete()) return;
    const UFont* RuntimeFont = EnsureCanvasFont();
    const float HScale = FMath::Clamp(Canvas->SizeY / 800.f, .76f, 1.4f);
    FVector AnimalPosition;
    int32 AnimalMeters;
    FVector2D AnimalPixel;
    if(M->MacaquePrompt(AnimalPosition,AnimalMeters) && PC->ProjectWorldLocationToScreen(AnimalPosition,AnimalPixel,true))
    {
        const FString Label=FString::Printf(TEXT("%s · %d m"),*M->Local(TEXT("Macaque"),TEXT("獼猴")),AnimalMeters);
        FCanvasTextItem Text(AnimalPixel,FText::FromString(Label),Overlay->Font(FMath::RoundToInt(16*HScale)),FLinearColor(1,.91f,.66f));
        Text.Font = RuntimeFont;
        Text.bCentreX=true; Text.bOutlined=true;
        Text.OutlineColor=FLinearColor(.06,.04,.03);
        Canvas->DrawItem(Text);
    }
    FTibetEnemyMeter Meter;
    const bool HasEnemy = M->GetEnemyMeter(Meter);
    FVector2D At;
    if (HasEnemy && PC->ProjectWorldLocationToScreen(Meter.Anchor, At, true) &&
        At.X > 0 && At.X < Canvas->SizeX && At.Y < Canvas->SizeY - 8)
    {
        const bool bBossBar = Meter.Maximum >= 5;
        const float Width = (bBossBar ? 148.f : 122.f) * HScale, Height = (bBossBar ? 12.f : 10.f) * HScale;
        const float X = FMath::Clamp(float(At.X) - Width * .5f, 8.f, Canvas->SizeX - Width - 8.f);
        const float Y = FMath::Clamp(float(At.Y), 24.f, Canvas->SizeY - 22.f);
        const FLinearColor OuterGold(.88f, .68f, .28f, .95f);
        const FLinearColor Frame(.07f, .05f, .08f, .95f);
        DrawRect(OuterGold, X-3, Y-3, Width+6, Height+6);
        DrawRect(Frame, X-1.5f, Y-1.5f, Width+3, Height+3);
        DrawRect(FLinearColor(.20f, .10f, .12f), X, Y, Width, Height);
        DrawRect(FLinearColor(1.f, .76f, .32f), X, Y, Width * Meter.Trailing / Meter.Maximum, Height);
        DrawRect(bBossBar ? FLinearColor(.88f, .16f, .14f) : FLinearColor(.82f, .22f, .20f),
                 X, Y, Width * Meter.Health / Meter.Maximum, Height);
        for (int32 I = 1; I < Meter.Maximum; ++I)
            DrawRect(Frame, X + Width * I / Meter.Maximum, Y + Height * .55f, HScale, Height * .45f);
        if (bBossBar)
        {
            const FString Tag = M->Local(TEXT("◆ Dharmapala / Boss ◆"), TEXT("◆ 護法試煉・首領 ◆"));
            FCanvasTextItem CrownText(FVector2D(At.X, Y - 18.f * HScale), FText::FromString(Tag),
                Overlay->Font(FMath::RoundToInt(12 * HScale)), FLinearColor(1.f, .86f, .46f));
            CrownText.Font = RuntimeFont;
            CrownText.bCentreX = true;
            CrownText.bOutlined = true;
            CrownText.OutlineColor = FLinearColor(.05f, .02f, .02f);
            Canvas->DrawItem(CrownText);
        }
    }
    const float Now = GetWorld()->GetTimeSeconds();
    const auto& Feedback = M->GetPlayerFeedback();
    const float Hurt = Feedback.HurtOpacity(Now);
    if (Hurt > 0)
    {
        const float Age = Now - Feedback.HitTime;
        FVector2D Shoulder;
        const FVector Anchor = PC->GetPawn()->GetActorLocation() + FVector(0, 0, 82);
        if (PC->ProjectWorldLocationToScreen(Anchor, Shoulder, true))
        {
            const FVector2D Position(
                FMath::Clamp(Shoulder.X + 44.f * HScale, 4., double(Canvas->SizeX) - 80. * HScale),
                FMath::Clamp(Shoulder.Y - (8.f + 30.f * Age) * HScale, 8., double(Canvas->SizeY) * .84));
            FCanvasTextItem Damage(Position, FText::AsNumber(-Feedback.Loss), GEngine->GetMediumFont(),
                FLinearColor(1.f, .38f, .30f, Hurt));
            Damage.Scale = FVector2D(2.15f * HScale);
            Damage.bOutlined = true;
            Damage.OutlineColor = FLinearColor(.065f, .012f, .014f, Hurt);
            Damage.EnableShadow(Damage.OutlineColor, FVector2D(2, 2));
            Canvas->DrawItem(Damage);
        }
        // Narrow peripheral strokes remain visible against both daylight and cave walls.
        const float Long = Canvas->SizeY * .19f, Thick = 4.f * HScale;
        for (const float X : {0.f, float(Canvas->SizeX) - Thick})
            DrawRect(FLinearColor(.86f, .11f, .08f, Hurt * .82f), X, Canvas->SizeY * .48f, Thick, Long);
    }
    for (const FTibetDamageCue& Cue : M->GetDamageCues())
    {
        const float T = FMath::Clamp((Now - Cue.SpawnTime) / 1.05f, 0.f, 1.f);
        if (!PC->ProjectWorldLocationToScreen(Cue.Origin, At, true)) continue;
        const float Alpha = 1 - FMath::SmoothStep(.58f,1.f,T);
        const float X = At.X + (9 + 18 * T) * HScale;
        const float Y = FMath::Max(3.f, float(At.Y) - (29 + 47 * T) * HScale);
        const float Size = HScale * (1.80f + .28f * (1 - T));
        const FString Loss = FString::Printf(TEXT("-%d"), Cue.Amount);
        FCanvasTextItem Numeral(FVector2D(X,Y), FText::FromString(Loss),
            GEngine->GetMediumFont(), FLinearColor(1,.90f,.63f,Alpha));
        Numeral.Scale = FVector2D(Size);
        Numeral.bOutlined = true;
        Numeral.OutlineColor = FLinearColor(.045f,.016f,.012f,Alpha);
        Numeral.EnableShadow(FLinearColor(.045f,.016f,.012f,Alpha),FVector2D(2,3));
        Canvas->DrawItem(Numeral);
    }
    FVector CueAnchor;
    if (M->GetInteractionCue(CueAnchor) && PC->ProjectWorldLocationToScreen(CueAnchor, At, true) &&
        At.X >= -32.0 && At.X <= Canvas->SizeX + 32.0 && At.Y >= -48.0 && At.Y <= Canvas->SizeY)
    {
        const FString Label = M->GetInteractionPrompt(Overlay->IsTouch());
        FCanvasTextItem Key(FVector2D::ZeroVector, FText::FromString(Label), Overlay->Font(FMath::RoundToInt(16 * HScale)),
            FLinearColor(1.f,.90f,.64f));
        Key.Font = RuntimeFont;
        Key.bOutlined = true;
        Key.OutlineColor = FLinearColor(.04f,.03f,.02f,.95f);
        const FVector2D Size = FSlateApplication::Get().GetRenderer()->GetFontMeasureService()->Measure(Label, Key.SlateFontInfo.GetValue());
        const double BoxW = Size.X + 16.0;
        const double BoxH = Size.Y + 8.0;
        const FVector2D Corner(
            FMath::Clamp(At.X - BoxW * .5, 4.0, FMath::Max(4.0, double(Canvas->SizeX) - BoxW - 4.0)),
            FMath::Clamp(At.Y - Size.Y - 6.0, 4.0, FMath::Max(4.0, double(Canvas->SizeY) - BoxH - 4.0)));
        DrawRect(FLinearColor(.88f,.68f,.28f,.92f), Corner.X - 1.5f, Corner.Y - 1.5f, BoxW + 3.0f, BoxH + 3.0f);
        DrawRect(FLinearColor(.06f,.08f,.13f,.95f), Corner.X, Corner.Y, BoxW, BoxH);
        bDrewInteraction = true;
        Key.Position = Corner + FVector2D(8.0, 4.0);
        Canvas->DrawItem(Key);
        return;
    }
    const FVector Target=M->GetObjectiveLocation()+FVector(0,0,130);
    FVector2D Point;
    const bool InFront=PC->ProjectWorldLocationToScreen(Target,Point,true);
    const float W=Canvas->SizeX,H=Canvas->SizeY;
    const float Pulse = Feedback.ObjectivePulse(Now);
    const FLinearColor Gold(1.f,.69f+.17f*Pulse,.23f+.18f*Pulse,1.f);
    auto MarkerStroke = [this,&Gold,HScale](const FVector2D& A, const FVector2D& B)
    {
        DrawLine(A.X,A.Y,B.X,B.Y,FLinearColor(.045f,.031f,.016f,.95f),5.f*HScale);
        DrawLine(A.X,A.Y,B.X,B.Y,Gold,2.6f*HScale);
    };
    if(!InFront)
    {
        FVector Eye;
        FRotator View;
        PC->GetPlayerViewPoint(Eye,View);
        const double Relative=FRotator::NormalizeAxis((Target-Eye).Rotation().Yaw-View.Yaw);
        Point={Relative<0?0.:double(W),H*.54};
    }
    const FVector2D Marker(FMath::Clamp(Point.X,32.,double(W)-32),
        FMath::Clamp(Point.Y,double(H)*.19,double(H)*.78));
    const float R=FMath::Clamp(H*.016f,9.f,19.f) * (1.f+.27f*Pulse);
    const float X=Marker.X,Y=Marker.Y;
    if (!Point.Equals(Marker,1.))
    {
        const FVector2D Direction=(Point-Marker).GetSafeNormal();
        const FVector2D Side(-Direction.Y,Direction.X);
        const FVector2D Tip=Marker+Direction*R, Base=Marker-Direction*R;
        MarkerStroke(Base + Side*R, Tip);
        MarkerStroke(Base - Side*R, Tip);
        return;
    }
    if (HasEnemy && Meter.Health > 0) return;
    const FVector2D Top(X,Y-R), Right(X+R,Y), Bottom(X,Y+R), Left(X-R,Y);
    MarkerStroke(Top,Right); MarkerStroke(Right,Bottom);
    MarkerStroke(Bottom,Left); MarkerStroke(Left,Top);
}
void ATibetHUD::EndPlay(const EEndPlayReason::Type Reason)
{
    if (IsJournalOpen()) CloseJournal();
    if(Overlay && GetWorld()->GetGameViewport()) GetWorld()->GetGameViewport()->RemoveViewportWidgetContent(Overlay.ToSharedRef());
    Overlay.Reset();
    Super::EndPlay(Reason);
}
