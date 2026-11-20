#include "TibetHUD.h"
#include "TibetGameMode.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Canvas.h"
#include "CanvasItem.h"
#include "Engine/Engine.h"
#include "GameFramework/PlayerController.h"
#include "TibetCharacter.h"
#include "TibetPlayOverlay.h"
#include "Framework/Application/SlateApplication.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

void ATibetHUD::BeginPlay()
{
    Super::BeginPlay();
#if !UE_BUILD_SHIPPING
    FString QA;
    if (FParse::Value(FCommandLine::Get(),TEXT("TibetQA="),QA) && QA==TEXT("Photo")) return;
#endif
    auto* Viewport=GetWorld()->GetGameViewport();
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (!Viewport || !Mode) return;
    const bool Touch=PLATFORM_IOS || FParse::Param(FCommandLine::Get(),TEXT("TibetTouch"));
    Overlay=SNew(STibetPlayOverlay).Mode(Mode).HUD(this).Touch(Touch);
    if (!Touch && GetOwningPlayerController()) GetOwningPlayerController()->SetShowMouseCursor(true);
    Viewport->AddViewportWidgetContent(Overlay.ToSharedRef());
}

bool ATibetHUD::IsJournalOpen() const
{
    return Page!=ETibetPage::Play;
}

void ATibetHUD::ToggleJournal(ETibetPage Next)
{
    auto* PC=GetOwningPlayerController();
    if (!Overlay || !PC) return;
    if (Next==Page || Next==ETibetPage::Play) { CloseJournal(); return; }
    if (!IsJournalOpen())
    {
        if (auto* Pilgrim=Cast<ATibetCharacter>(PC->GetPawn())) Pilgrim->CancelGameplayInput();
        bCursorBeforeJournal=PC->bShowMouseCursor;
        bPausedByJournal=!PC->IsPaused() && PC->SetPause(true);
        PC->SetShowMouseCursor(true);
        FSlateApplication::Get().ReleaseAllPointerCapture();
    }
    Page=Next;
    Overlay->Show(Page);
    FSlateApplication::Get().SetKeyboardFocus(Overlay,EFocusCause::SetDirectly);
}

void ATibetHUD::CloseJournal()
{
    if (!IsJournalOpen()) return;
    Page=ETibetPage::Play;
    if (auto* PC=GetOwningPlayerController())
    {
        if (bPausedByJournal) PC->SetPause(false);
        PC->SetShowMouseCursor(bCursorBeforeJournal);
        if (auto* Pilgrim=Cast<ATibetCharacter>(PC->GetPawn())) Pilgrim->CancelGameplayInput();
    }
    bPausedByJournal=false;
    if (Overlay) Overlay->Show(Page);
    FSlateApplication::Get().SetAllUserFocusToGameViewport();
}
void ATibetHUD::DrawHUD()
{
    Super::DrawHUD();
    const auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    const auto* PC=GetOwningPlayerController();
    if(IsJournalOpen() || !Overlay || !Canvas || !PC || !PC->GetPawn() || !M || M->IsCampaignComplete()) return;
    const float HScale = FMath::Clamp(Canvas->SizeY / 800.f, .76f, 1.4f);
    FVector AnimalPosition;
    int32 AnimalMeters;
    FVector2D AnimalPixel;
    if(M->MacaquePrompt(AnimalPosition,AnimalMeters) && PC->ProjectWorldLocationToScreen(AnimalPosition,AnimalPixel,true))
    {
        const FString Label=FString::Printf(TEXT("%s · %d m"),*M->Local(TEXT("Macaque"),TEXT("獼猴")),AnimalMeters);
        FCanvasTextItem Text(AnimalPixel,FText::FromString(Label),GEngine->GetMediumFont(),FLinearColor(1,.91f,.66f));
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
        const float Width = 117 * HScale, Height = 10 * HScale;
        const float X = FMath::Clamp(float(At.X) - Width * .5f, 6.f, Canvas->SizeX - Width - 6.f);
        const float Y = FMath::Clamp(float(At.Y), 18.f, Canvas->SizeY - 20.f);
        const FLinearColor Frame(.095f,.066f,.069f,.94f);
        DrawRect(Frame, X-2, Y-2, Width+4, Height+4);
        DrawRect(FLinearColor(.23f,.14f,.15f), X, Y, Width, Height);
        DrawRect(FLinearColor(1,.73f,.31f), X, Y, Width * Meter.Trailing / Meter.Maximum, Height);
        DrawRect(FLinearColor(.83f,.19f,.18f), X, Y, Width * Meter.Health / Meter.Maximum, Height);
        for (int32 I = 1; I < Meter.Maximum; ++I)
            DrawRect(Frame, X + Width * I / Meter.Maximum, Y + Height * .59f, HScale, Height * .41f);
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
