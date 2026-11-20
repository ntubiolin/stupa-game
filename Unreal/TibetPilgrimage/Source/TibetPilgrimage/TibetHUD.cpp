#include "TibetHUD.h"
#include "TibetGameMode.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Canvas.h"
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
    DrawLine(X,Y-R,X+R,Y,Gold,2); DrawLine(X+R,Y,X,Y+R,Gold,2);
    DrawLine(X,Y+R,X-R,Y,Gold,2); DrawLine(X-R,Y,X,Y-R,Gold,2);
}
void ATibetHUD::EndPlay(const EEndPlayReason::Type Reason)
{
    if (IsJournalOpen()) CloseJournal();
    if(Overlay && GetWorld()->GetGameViewport()) GetWorld()->GetGameViewport()->RemoveViewportWidgetContent(Overlay.ToSharedRef());
    Overlay.Reset();
    Super::EndPlay(Reason);
}
