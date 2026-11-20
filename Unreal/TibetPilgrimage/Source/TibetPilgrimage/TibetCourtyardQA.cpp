#include "TibetQASubsystem.h"
#include "TibetGameMode.h"
#include "TibetMacaques.h"
#include "TibetButterFlame.h"
#include "Camera/CameraActor.h"
#include "Components/PointLightComponent.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "InputKeyEventArgs.h"
#include "Kismet/GameplayStatics.h"
#include "UnrealClient.h"

void UTibetQASubsystem::Courtyard(APlayerController& PC,ATibetGameMode& Mode)
{
    const double Now=FPlatformTime::Seconds();
    if(Now-Began>120) { Finish(false,FString::Printf(TEXT("Courtyard timeout at %d"),CourtyardStep)); return; }
    if(Now-Began<2 || FScreenshotRequest::IsScreenshotRequested()) return;
    auto Next=[&](){Record(FString::Printf(TEXT("phase\t%d\t%s"),CourtyardStep,*PC.GetPawn()->GetActorLocation().ToCompactString())); ++CourtyardStep; CourtyardSince=Now;};
    const auto Stroke=[&](FKey K,bool Down){PC.InputKey(FInputKeyEventArgs::CreateSimulated(K,Down?IE_Pressed:IE_Released,Down?1:0));};
    auto Click=[&](FName Tag,float X=.5f){if(!TapPlayControl(Tag,X)) {if(CourtyardSince>0 && Now-CourtyardSince>6) Finish(false,TEXT("Missing control ")+Tag.ToString());return false;} return true;};
    auto Shot=[&](const TCHAR* Name,bool UI){FScreenshotRequest::RequestScreenshot(Output/(FString(Name)+TEXT(".png")),UI,false,false);};
    auto Move=[&](FVector Goal,float Reach){
        FVector D=Goal-PC.GetPawn()->GetActorLocation(); D.Z=0;
        PC.SetControlRotation(D.Rotation());
        const bool Walk=D.Size()>Reach;
        if(Walk!=bMoving) {Stroke(EKeys::W,Walk);bMoving=Walk;}
        return !Walk;
    };
    auto View=[&](FVector Eye,FVector At){
        if(!Camera) Camera=GetWorld()->SpawnActor<ACameraActor>();
        Camera->SetActorLocationAndRotation(Eye,(At-Eye).Rotation());
        PC.SetViewTarget(Camera);
    };
    ATibetMacaques* Monkeys=nullptr;
    if(TActorIterator<ATibetMacaques> It{GetWorld()}; It) Monkeys=*It;
    if(!Monkeys) {Finish(false,TEXT("No macaques in Boudhanath")); return;}
    TArray<AActor*> Lamps;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(),TEXT("StupaLampFlame"),Lamps);
    ATibetButterFlame* Lamp=Lamps.IsEmpty()?nullptr:Cast<ATibetButterFlame>(Lamps[0]);
    if(FParse::Param(FCommandLine::Get(),TEXT("TibetQAClockOnly")))
    {
        if(CourtyardStep==0)
        {
            Mode.SetClockRate(1);
            Next();
        }
        else if(Now-CourtyardSince>.3)
        {
            if(CourtyardStep==1) Shot(TEXT("clock-1x"),true);
            if(CourtyardStep==2) Mode.SetClockRate(4);
            if(CourtyardStep==3) Shot(TEXT("clock-4x"),true);
            if(CourtyardStep==4) {Finish(true,TEXT("clock 1x and 4x drawn")); return;}
            Next();
        }
        return;
    }
    if(Task==TEXT("CourtyardResume"))
    {
        Finish(Mode.ClockRate()==0 && Mode.SolarPhase()>.81f && Mode.SolarPhase()<.96f &&
            Mode.FedCount()==1 && Mode.BestFeedingScore()==5 && Lamp,TEXT("night, flame and offerings survived relaunch"));
        return;
    }
    const double Wait=Now-CourtyardSince;
    switch(CourtyardStep)
    {
    case 0:
        if(Monkeys->Location(0).Z<130 || Monkeys->Location(1).Z<130 || Monkeys->Location(2).Z>5 ||
            Monkeys->Location(4).IsZero() || !Lamps.IsEmpty() || Mode.ClockRate()!=1)
        {Finish(false,TEXT("Incorrect starting plaza"));return;}
        CheckedPhase=Mode.SolarPhase(); ClockStarted=GetWorld()->GetTimeSeconds();
        if(Click(TEXT("TibetClockFast"))) Next(); break;
    case 1:
    {
        const float GameTime=GetWorld()->GetTimeSeconds()-ClockStarted;
        if(GameTime<2) break;
        const float Rate=(Mode.SolarPhase()-CheckedPhase)*240/GameTime;
        if(Mode.ClockRate()!=4 || Rate<3.5 || Rate>4.5) {Finish(false,TEXT("4x clock rate mismatch"));return;}
        Record(FString::Printf(TEXT("clock\t%.2f"),Rate));
        if(Click(TEXT("TibetClockPause"))) Next(); break;
    }
    case 2:
        if(Wait<.22) break;
        if(Mode.ClockRate()!=0) {Finish(false,TEXT("Clock did not pause"));return;}
        if(Click(TEXT("TibetClockSlider"),.46f)) Next(); break;
    case 3:
        if(Wait<.3) break;
        if(Mode.SolarPhase()<.40 || Mode.SolarPhase()>.53) {Finish(false,TEXT("Time slider did not set day"));return;}
        if(Move(Monkeys->Location(2),310))
        {
            const float Yaw=(Monkeys->Location(2)-PC.GetPawn()->GetActorLocation()).Rotation().Yaw;
            PC.SetControlRotation(FRotator(-11,Yaw-15,0));
            Next();
        }
        break;
    case 4:
        if(Wait<.5) break;
        if(!Mode.CanFeed()) {Finish(false,TEXT("Macaque unreachable"));return;}
        Shot(TEXT("macaque"),false); Stroke(EKeys::F,true); Next(); break;
    case 5:
        Stroke(EKeys::F,false);
        if(Wait<.30) break;
        if(Mode.FeedingPanel()!=1) {Finish(false,TEXT("F did not open offering"));return;}
        Shot(TEXT("feeding"),true);
        if(Click(TEXT("TibetFruitGame"))) Next(); break;
    case 6:
        if(Wait<.24) break;
        if(Tapped.IsValid()) {Stroke(Tapped,false); Tapped=FKey();}
        if(Mode.FeedingPanel()==3)
        {
            if(Mode.FedCount()!=1 || Mode.BestFeedingScore()!=5 || !Monkeys->IsEating(2))
            {Finish(false,TEXT("Five matched fruits did not feed the chosen macaque"));return;}
            Shot(TEXT("offered"),true); Next(); break;
        }
        if(Mode.FeedingPanel()!=2 || !FMath::IsWithinInclusive(Mode.RequestedFruit(),0,2))
        {Finish(false,TEXT("No fruit prompt"));return;}
        {const FKey Keys[]={EKeys::One,EKeys::Two,EKeys::Three}; Tapped=Keys[Mode.RequestedFruit()];}
        Stroke(Tapped,true); CourtyardSince=Now; break;
    case 7:
        if(Click(TEXT("TibetCloseFeeding"))) Next(); break;
    case 8:
        if(Wait<.18) break;
        if(Frames==0)
        {
            const FVector At=Monkeys->Location(2);
            View(At+FVector(-112,132,65),At+FVector(0,0,49));
            ++Frames; CourtyardSince=Now; break;
        }
        if(Frames==1)
        {
            FVector Banana;
            float Toe;
            if(!Monkeys->HoldingFruit(2,Banana,Toe))
            {
                if(!Monkeys->IsEating(2)) Finish(false,TEXT("Macaque did not hold the fruit"));
                break;
            }
            const FVector Relative=Banana-Monkeys->Location(2);
            const FVector Giver=(PC.GetPawn()->GetActorLocation()-Monkeys->Location(2)).GetSafeNormal2D();
            if(FVector::DotProduct(Relative,Giver)<15 || Relative.Z<49 || FMath::Abs(Toe)>3)
            {Finish(false,TEXT("The offering must be in front of a grounded, seated macaque")); return;}
            Record(FString::Printf(TEXT("held-fruit\t%s\ttoeCm=%.1f"),*Relative.ToCompactString(),Toe));
            Shot(TEXT("feeding-banana"),false); ++Frames; break;
        }
        if(PC.GetViewTarget()!=PC.GetPawn()) PC.SetViewTarget(PC.GetPawn());
        if(Move(FVector(1430,-360,0),155)) {Stroke(EKeys::E,true); Next();} break;
    case 9:
        Stroke(EKeys::E,false); Next(); break;
    case 10:
        if(Wait<.35) break;
        if(!Lamp || !Lamp->FindComponentByClass<UPointLightComponent>()) {Finish(false,TEXT("No warm source on the offered wick"));return;}
        CheckedFlame=Lamp->GetFlicker();
        View({1640,-1320,380},{3340,-150,1420}); Next(); break;
    case 11:
        if(Wait<1.4) break;
        Shot(TEXT("flags-a"),false); Next(); break;
    case 12:
        if(Wait<.37) break;
        Shot(TEXT("flags-b"),false); Next(); break;
    case 13:
        if(Click(TEXT("TibetClockSlider"),.89f)) Next(); break;
    case 14:
        if(Wait<3) break;
        if(Mode.ClockRate()!=0 || Mode.SolarPhase()<.81 || Mode.SolarPhase()>.96)
        {Finish(false,TEXT("Time slider did not set night"));return;}
        Shot(TEXT("night"),false); Next(); break;
    case 15:
        View({1300,-535,145},{1494,-301,141}); Next(); break;
    case 16:
        if(Wait<1.0 || !Lamp || FMath::Abs(Lamp->GetFlicker()-CheckedFlame)<.05) break;
        Shot(TEXT("butter-lamp"),false); Next(); break;
    default:
        Finish(true,TEXT("five macaques, fruit offering, lit wick, wind and night")); break;
    }
}
