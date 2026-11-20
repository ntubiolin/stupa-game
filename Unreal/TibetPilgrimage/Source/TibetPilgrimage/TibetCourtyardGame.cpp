#include "TibetGameMode.h"
#include "TibetCharacter.h"
#include "TibetHUD.h"
#include "GameFramework/PlayerController.h"
#include "TibetMacaques.h"
#include "TibetSkyClock.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"

void ATibetGameMode::StartCourtyard()
{
    if(!Map.StartsWith(TEXT("terma"))) OutdoorSky=GetWorld()->SpawnActor<ATibetSkyClock>();
    if(Map==TEXT("stupa")) Macaques=GetWorld()->SpawnActor<ATibetMacaques>();
    if(OutdoorSky) OutdoorSky->Apply(SolarPhase());
}
void ATibetGameMode::UpdateClock(float Dt)
{
    Save->SolarPhase=FMath::Fmod(Save->SolarPhase+Dt*Save->ClockRate/240.f,1.f);
    SinceSkyUpdate+=Dt;
    if(SinceSkyUpdate>=.15f)
    {
        SinceSkyUpdate=0;
        if(OutdoorSky) OutdoorSky->Apply(SolarPhase());
        if(Macaques) Macaques->SetDaylight(ATibetSkyClock::Daylight(SolarPhase()));
    }
    SinceClockSave+=Dt;
    if(SinceClockSave>=30 && ClockRate()!=0) { SinceClockSave=0; Store(); }
}
void ATibetGameMode::SetClockRate(int32 Rate)
{
    if(!Save || (Rate!=0 && Rate!=1 && Rate!=4)) return;
    Save->ClockRate=Rate; Store();
}
void ATibetGameMode::SetSolarPhase(float Phase,bool bCommit)
{
    if(!Save) return;
    Save->SolarPhase=FMath::Clamp(Phase,0.f,.99999f);
    if(OutdoorSky) OutdoorSky->Apply(SolarPhase());
    if(Macaques) Macaques->SetDaylight(ATibetSkyClock::Daylight(SolarPhase()));
    if(bCommit) Store();
}
FString ATibetGameMode::TimeLabel() const
{
    const int32 Minutes=FMath::FloorToInt(SolarPhase()*1440);
    const float P=SolarPhase();
    const FString Period=P<.23f || P>=.78f ? Local(TEXT("Night"),TEXT("夜晚")) :
        (P<.31f ? Local(TEXT("Dawn"),TEXT("清晨")) : P<.69f ? Local(TEXT("Day"),TEXT("白日")) : Local(TEXT("Dusk"),TEXT("黃昏")));
    return FString::Printf(TEXT("%02d:%02d  %s"),Minutes/60,Minutes%60,*Period);
}
bool ATibetGameMode::CanFeed() const
{
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    return P && Macaques && Macaques->Nearest(P->GetActorLocation())!=INDEX_NONE;
}
bool ATibetGameMode::MacaquePrompt(FVector& Position,int32& Meters) const
{
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if(!Macaques || !P || FeedingPanel()) return false;
    const int32 Index=Macaques->Nearest(P->GetActorLocation(),1000);
    if(Index==INDEX_NONE) return false;
    Position=Macaques->Location(Index)+FVector(0,0,100);
    Meters=FMath::RoundToInt(FVector::Dist2D(P->GetActorLocation(),Position)/100);
    return true;
}
void ATibetGameMode::BeginFeeding()
{
    if(FeedPanel!=0) { CloseFeeding(); return; }
    auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if(!P || !Macaques) return;
    FeedTarget=Macaques->Nearest(P->GetActorLocation());
    if(FeedTarget==INDEX_NONE) return;
    Macaques->Attend(FeedTarget);
    if(auto* Pilgrim=Cast<ATibetCharacter>(P)) Pilgrim->CancelGameplayInput();
    bFedThisSession=false; FeedPanel=1;
    if (auto* PC=GetWorld()->GetFirstPlayerController())
        if (auto* HUD=PC->GetHUD<ATibetHUD>()) HUD->RefreshInputMode();
}
void ATibetGameMode::CloseFeeding()
{
    if(Macaques) Macaques->Attend(INDEX_NONE);
    FeedPanel=0; FeedTarget=INDEX_NONE;
    if (auto* PC=GetWorld()->GetFirstPlayerController())
        if (auto* HUD=PC->GetHUD<ATibetHUD>()) HUD->RefreshInputMode();
}
void ATibetGameMode::RewardFeeding()
{
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if(bFedThisSession || !P || !Macaques || !Macaques->Offer(FeedTarget,P->GetActorLocation())) return;
    bFedThisSession=true; ++Save->MonkeysFed;
    Mana=FMath::Min(100.f,Mana+10);
    SetNotice(Local(TEXT("The macaque takes the banana."),TEXT("獼猴接住香蕉，開心地吃了起來。")));
}
void ATibetGameMode::QuickFeed()
{
    if(FeedPanel!=1) return;
    RewardFeeding(); Store(); CloseFeeding();
}
void ATibetGameMode::StartFruitGame()
{
    if(FeedPanel!=1 && FeedPanel!=3) return;
    FeedPanel=2; FruitRound=FruitScore=FruitAffection=0;
    FruitRequest=FMath::RandRange(0,2);
}
void ATibetGameMode::PickFruit(int32 Fruit)
{
    if(FeedPanel!=2 || Fruit<0 || Fruit>2) return;
    LastFruitMatched=Fruit==FruitRequest;
    if(LastFruitMatched) {++FruitScore; FruitAffection+=2;} else FruitAffection=FMath::Max(0,FruitAffection-1);
    if(++FruitRound==5)
    {
        FeedPanel=3; ++Save->FeedingPlays;
        Save->FeedingBest=FMath::Max(Save->FeedingBest,FruitScore);
        if(FruitScore>0) RewardFeeding();
        Store();
    }
    else FruitRequest=(FruitRequest+FMath::RandRange(1,2))%3;
}
FString ATibetGameMode::FruitName(int32 I) const
{
    if(I==0) return Local(TEXT("Banana"),TEXT("香蕉"));
    if(I==1) return Local(TEXT("Apple"),TEXT("蘋果"));
    return Local(TEXT("Peach"),TEXT("桃子"));
}
FString ATibetGameMode::FeedingText() const
{
    if(FeedPanel==1) return Local(TEXT("Offer a banana or choose the fruit the macaque asks for."),TEXT("直接供養香蕉，或挑出獼猴想吃的水果。"));
    if(FeedPanel==3) return IsEnglish() ? FString::Printf(TEXT("%d / 5 correct · Affection %d · Best %d/5"),FruitScore,FruitAffection,BestFeedingScore()) :
        FString::Printf(TEXT("答對 %d / 5・親密 %d・最佳 %d / 5"),FruitScore,FruitAffection,BestFeedingScore());
    const FString Feedback=FruitRound ? (LastFruitMatched?Local(TEXT("It liked that!  "),TEXT("牠很喜歡！　")):Local(TEXT("Try another.  "),TEXT("試試另一種。　"))) : FString();
    return Feedback+FString::Printf(TEXT("%d / 5 · "),FruitRound+1)+Local(TEXT("The macaque wants "),TEXT("獼猴想吃"))+FruitName(FruitRequest);
}


bool ATibetGameMode::InscribeDedication(const FString& Pilgrim,const FString& Prayer)
{
    if (!Save || bTravel) return false;
    FTibetDedication Offering;
    Offering.Pilgrim=Pilgrim.TrimStartAndEnd();
    Offering.Prayer=Prayer.TrimStartAndEnd();
    if (Offering.Prayer.IsEmpty() || Offering.Prayer.Len()>120 || Offering.Pilgrim.Len()>24) return false;
    Save->Dedications.Add(MoveTemp(Offering));
    if (Store()) return true;
    Save->Dedications.Pop();
    return false;
}
