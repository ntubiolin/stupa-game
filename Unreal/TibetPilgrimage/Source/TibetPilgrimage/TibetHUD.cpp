#include "TibetHUD.h"
#include "TibetGameMode.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Canvas.h"
#include "CanvasItem.h"
#include "Engine/Engine.h"
#include "GameFramework/PlayerController.h"
#include "Fonts/CompositeFont.h"
#include "Misc/Paths.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SSafeZone.h"
#include "Widgets/SOverlay.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"

void ATibetHUD::BeginPlay()
{
    Super::BeginPlay();
#if !UE_BUILD_SHIPPING
    FString QA;
    if(FParse::Value(FCommandLine::Get(),TEXT("TibetQA="),QA) && QA==TEXT("Photo")) return;
#endif
    auto* Viewport=GetWorld()->GetGameViewport();
    auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if(!Viewport || !M) return;
    const FLinearColor Paper(.96,.92,.81),Gold(.96,.69,.30),Panel(.025,.036,.033,.81);
    const FSlateBrush* White=FCoreStyle::Get().GetBrush("WhiteBrush");
    const FString Fallback=FPaths::EngineContentDir()/TEXT("Slate/Fonts/DroidSansFallback.ttf");
    const auto Typeface=MakeShared<FStandaloneCompositeFont>(TEXT("Regular"),Fallback,EFontHinting::Default,EFontLoadingPolicy::LazyLoad);
    auto Font=[Typeface](int32 Size){return FSlateFontInfo(Typeface,Size,TEXT("Regular"),FFontOutlineSettings());};
    TSharedRef<SVerticalBox> Content=SNew(SVerticalBox);
    Content->AddSlot().AutoHeight()[SNew(STextBlock).Font(Font(22)).ColorAndOpacity(Gold)
        .Text_Lambda([M](){return FText::FromString(M->AreaName());})];
    Content->AddSlot().AutoHeight().Padding(0,4)[SNew(STextBlock).Font(Font(14)).ColorAndOpacity(Paper)
        .WrapTextAt(420).Text_Lambda([M](){return FText::FromString(M->GetObjectiveText());})];
    const bool Touch=PLATFORM_IOS || FParse::Param(FCommandLine::Get(),TEXT("TibetTouch"));
    Content->AddSlot().AutoHeight()[SNew(STextBlock).Font(Font(12)).ColorAndOpacity(Gold)
        .WrapTextAt(420).Text_Lambda([M,Touch](){return FText::FromString(M->Status(Touch));})];
    TSharedRef<SVerticalBox> Controls=SNew(SVerticalBox);
    if(Touch)
    {
        // Screen-height fractions use the actual viewport overlay's Slate space, including its DPI scale.
        // On a 440-point landscape iPhone, 11% is a 48.4-point hit target.
        auto Height=[this](){return Overlay ? float(Overlay->GetCachedGeometry().GetLocalSize().Y) : 0.f;};
        auto Target=TAttribute<FOptionalSize>::CreateLambda([Height](){
            return FOptionalSize(FMath::Max(44.f,Height()*.11f));
        });
        auto TouchFont=TAttribute<FSlateFontInfo>::CreateLambda([Height,Font](){
            return Font(FMath::Max(12,FMath::RoundToInt(Height()*.027f)));
        });
        TSharedRef<SHorizontalBox> Row=SNew(SHorizontalBox);
        Controls->AddSlot().AutoHeight()[Row];
        const TCHAR* En[]={TEXT("Act"),TEXT("Hūṃ"),TEXT("Chant"),TEXT("Phurba"),TEXT("Bell"),TEXT("Lotus"),TEXT("Guard"),TEXT("Guru"),TEXT("EN/中")};
        const TCHAR* Zh[]={TEXT("互動"),TEXT("吽"),TEXT("真言"),TEXT("金剛橛"),TEXT("鈴"),TEXT("蓮盾"),TEXT("護法"),TEXT("上師"),TEXT("中/EN")};
        for(int32 i=0;i<UE_ARRAY_COUNT(En);++i)
        {
            if(i==3 || i==6)
            {
                Row=SNew(SHorizontalBox);
                Controls->AddSlot().HAlign(HAlign_Right).AutoHeight()[Row];
            }
            FString E=En[i],Z=Zh[i];
            Row->AddSlot().AutoWidth().Padding(2)[SNew(SBox).MinDesiredWidth(Target).MinDesiredHeight(Target)
                [SNew(SButton).HAlign(HAlign_Center).VAlign(VAlign_Center)
                .ContentPadding(FMargin(5,3)).IsFocusable(false)
                .OnClicked_Lambda([M,i](){if(i==0)M->Interact();else if(i==8)M->ChangeLanguage();else M->CastSkill(i-1);return FReply::Handled();})
                [SNew(STextBlock).Font(TouchFont).ColorAndOpacity(FLinearColor::White)
                    .Text_Lambda([M,E,Z](){return FText::FromString(M->IsEnglish()?E:Z);})]]];
        }
    }
    else
    {
        Controls->AddSlot().AutoHeight()[SNew(STextBlock).Font(Font(12)).ColorAndOpacity(Paper)
            .Text_Lambda([M](){return FText::FromString(M->Local(
                TEXT("WASD Move   Hold right mouse and drag to look   E Interact\nSpace Hūṃ   R Chant   1–4/T Skills   L Language"),
                TEXT("WASD 移動   按住滑鼠右鍵拖曳轉向   E 互動\n空白鍵 吽   R 真言   1–4/T 法術   L 語言")));})];
    }
    auto Layout=SNew(SOverlay).Visibility(EVisibility::SelfHitTestInvisible)
        +SOverlay::Slot().HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(16)
        [SNew(SBorder).Visibility(EVisibility::HitTestInvisible).BorderImage(White).BorderBackgroundColor(Panel)
            .Padding(FMargin(14,9))[Content]]
        +SOverlay::Slot().HAlign(HAlign_Right).VAlign(VAlign_Bottom).Padding(16)
        [SNew(SBorder).BorderImage(White).BorderBackgroundColor(Panel).Padding(5)[Controls]];
    if(Touch)
    {
        Layout->AddSlot().HAlign(HAlign_Left).VAlign(VAlign_Bottom).Padding(24)[
            SNew(STextBlock).Visibility(EVisibility::HitTestInvisible).Font(Font(14)).ColorAndOpacity(Paper)
            .Text_Lambda([M](){return FText::FromString(M->Local(TEXT("Drag left to walk · right to look"),TEXT("左側拖曳移動・右側轉向")));})];
    }
    Overlay=SNew(SSafeZone).Visibility(EVisibility::SelfHitTestInvisible)[Layout];
    Viewport->AddViewportWidgetContent(Overlay.ToSharedRef());
}
void ATibetHUD::DrawHUD()
{
    Super::DrawHUD();
    const auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    const auto* PC=GetOwningPlayerController();
    if(!Overlay || !Canvas || !PC || !PC->GetPawn() || !M || M->IsCampaignComplete()) return;
    const float HScale = FMath::Clamp(Canvas->SizeY / 800.f, .76f, 1.4f);
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
    const FLinearColor Gold(.98,.67,.19,.95);
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
    const float R=FMath::Clamp(H*.009f,4.f,10.f);
    const float X=Marker.X,Y=Marker.Y;
    if (!Point.Equals(Marker,1.))
    {
        const FVector2D Direction=(Point-Marker).GetSafeNormal();
        const FVector2D Side(-Direction.Y,Direction.X);
        const FVector2D Tip=Marker+Direction*R, Base=Marker-Direction*R;
        DrawLine(Base.X+Side.X*R,Base.Y+Side.Y*R,Tip.X,Tip.Y,Gold,2);
        DrawLine(Base.X-Side.X*R,Base.Y-Side.Y*R,Tip.X,Tip.Y,Gold,2);
        return;
    }
    if (HasEnemy && Meter.Health > 0) return;
    DrawLine(X,Y-R,X+R,Y,Gold,2); DrawLine(X+R,Y,X,Y+R,Gold,2);
    DrawLine(X,Y+R,X-R,Y,Gold,2); DrawLine(X-R,Y,X,Y-R,Gold,2);
}
void ATibetHUD::EndPlay(const EEndPlayReason::Type Reason)
{
    if(Overlay && GetWorld()->GetGameViewport()) GetWorld()->GetGameViewport()->RemoveViewportWidgetContent(Overlay.ToSharedRef());
    Overlay.Reset();
    Super::EndPlay(Reason);
}
