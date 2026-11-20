#include "TibetGameMode.h"
#include "TibetCharacter.h"
#include "TibetHUD.h"
#include "TibetPlayOverlay.h"
#include "TibetVoice.h"
#include "Async/Async.h"
#include "Misc/App.h"
#include "TimerManager.h"
#include "GameFramework/PlayerController.h"
#include "TibetBossHalo.h"
#include "TibetRitualEffect.h"
#include "TibetTravelGate.h"
#include "TibetButterFlame.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "Engine/TargetPoint.h"
#include "GameFramework/Character.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

namespace
{
enum class EObjective { Talk, Kora, Interact, Reach, Combat, Boss, Escort, Gate };
struct FObjective { EObjective Kind; const TCHAR* En; const TCHAR* Zh; int32 Count; const TCHAR* SpeechEn; const TCHAR* SpeechZh; const TCHAR* Resident = nullptr; const TCHAR* SpeakerEn = nullptr; const TCHAR* SpeakerZh = nullptr; };
const TMap<FString,TArray<FObjective>>& Routes()
{
    static const TMap<FString,TArray<FObjective>> Table = {
#include "TibetRoute.inl"
    };
    return Table;
}
const FObjective& Objective(const FString& Route, int32 Index)
{
    static const FObjective Gate{EObjective::Gate,TEXT("Cross the northern threshold"),TEXT("前往北側出入口"),1,TEXT(""),TEXT("")};
    const auto* List = Routes().Find(Route);
    return List && List->IsValidIndex(Index) ? (*List)[Index] : Gate;
}
const TArray<FString> Order = {TEXT("stupa"),TEXT("grove"),TEXT("wild"),TEXT("pharping"),TEXT("mangyul"),
    TEXT("yarlung"),TEXT("samye"),TEXT("chimphu"),TEXT("terma1"),TEXT("terma2"),TEXT("terma3")};
const TCHAR* EnglishNames[]={TEXT("Boudhanath Stupa"),TEXT("Pilgrim Stupa Grove"),TEXT("Northern Wilderness"),
    TEXT("Pharping · Yangleshö"),TEXT("Mangyul · Kyirong Pass"),TEXT("Yarlung Valley"),TEXT("Samye Monastery"),
    TEXT("Chimphu Hermitage"),TEXT("Terma · Earth"),TEXT("Terma · Crystal"),TEXT("Terma · Sky")};
const TCHAR* ChineseNames[]={TEXT("博達哈大佛塔"),TEXT("行者塔林"),TEXT("北郊原野"),TEXT("帕平・揚列雪"),
    TEXT("芒域・吉隆山口"),TEXT("雅礱河谷"),TEXT("桑耶寺"),TEXT("青浦修行地"),TEXT("伏藏・地窟"),TEXT("伏藏・水晶"),TEXT("伏藏・虛空")};

struct FRitualSkill
{
    const TCHAR* En;
    const TCHAR* Zh;
    const TCHAR* Binding;
    int32 UnlockMap;
    float Cost, Recovery, Range;
    int32 Power;
};
const FRitualSkill Skills[] = {
    {TEXT("Hūṃ Bolt"), TEXT("吽字光彈"), TEXT("Space"), 0, 0, .35f, 1400, 1},
    {TEXT("Six-Syllable Mantra"), TEXT("六字真言"), TEXT("R"), 0, 15, .85f, 750, 2},
    {TEXT("Vajra Phurba"), TEXT("金剛橛"), TEXT("1"), 4, 14, 6, 950, 3},
    {TEXT("Vajra Bell"), TEXT("金剛鈴"), TEXT("2"), 5, 18, 9, 900, 3},
    {TEXT("Lotus Ward"), TEXT("蓮花護盾"), TEXT("3"), 6, 16, 8, 0, 0},
    {TEXT("Guardian Invocation"), TEXT("護法召喚"), TEXT("4"), 7, 22, 12, 1150, 4},
    {TEXT("Vajra Guru Mantra"), TEXT("上師心咒"), TEXT("T"), 8, 35, 18, 1600, 6}
};

bool OnObjectiveFloor(const APawn* Pawn, const FVector& Goal)
{
    if (Goal.Z < 45) return true;
    const auto* Character = Cast<ACharacter>(Pawn);
    if (!Character) return false;
    const double Feet = Pawn->GetActorLocation().Z - Character->GetCapsuleComponent()->GetScaledCapsuleHalfHeight();
    return FMath::Abs(Feet - Goal.Z) <= 28;
}

struct FResidentPlacement { const TCHAR* Map; const TCHAR* Id; const TCHAR* Model; FVector Home; const TCHAR* Marker = nullptr; };
const FResidentPlacement CastPlacements[] = {
#include "TibetResidents.inl"
};
const FVector MessengerDestination(1370,-65,0);
const FVector GroveGate(-1860,-480,0);
// The three quest bowls have individual wicks. The bronze table on the
// southern approach already has lit lamps in the plaza mesh.
constexpr int32 SouthLampTable = 3;
FVector StupaLampLocation(int32 Index)
{
    if (Index==SouthLampTable) return FVector(-1080,615,0);
    return FVector(1430+70*Index,-360+320*Index,0);
}
const FString Cylinder=TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
const FString Sphere=TEXT("/Engine/BasicShapes/Sphere.Sphere");
const FLinearColor Gold(.87,.43,.065);
}

AActor* ATibetGameMode::MeshActor(const FVector& Pos, const FString& Path, const FVector& Scale,
                  const FLinearColor* Color)
{
    auto* Mesh=LoadObject<UStaticMesh>(nullptr,*Path);
    if (!Mesh || (Color && !RitualMaterial)) return nullptr;
    auto* A=GetWorld()->SpawnActor<AActor>();
    auto* C=NewObject<UStaticMeshComponent>(A);
    A->SetRootComponent(C);
    C->SetMobility(EComponentMobility::Movable);
    C->SetStaticMesh(Mesh);
    C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if (Color)
    {
        auto* Mat = C->CreateDynamicMaterialInstance(0, RitualMaterial);
        Mat->SetVectorParameterValue(TEXT("Color"),*Color);
    }
    C->RegisterComponent();
    A->SetActorLocation(Pos);
    A->SetActorScale3D(Scale);
    return A;
}

ATibetGameMode::ATibetGameMode()
{
    PrimaryActorTick.bCanEverTick=true;
    DefaultPawnClass=ATibetCharacter::StaticClass();
    HUDClass=ATibetHUD::StaticClass();
}
void ATibetGameMode::StartPlay()
{
    Super::StartPlay();
    Map=UGameplayStatics::GetCurrentLevelName(this,true).ToLower();
    if (!Order.Contains(Map)) return;
    // The generated material lives within the project's always-cooked /Game/Figures directory.
    RitualMaterial=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Figures/Materials/M_RitualColor.M_RitualColor"));
    if (!RitualMaterial) UE_LOG(LogTemp,Error,TEXT("Missing M_RitualColor; regenerate the spell material before cooking."));
    SlotName=TEXT("TibetPilgrimage-v1");
    FParse::Value(FCommandLine::Get(),TEXT("TibetSaveSlot="),SlotName);
    Save=Cast<UTibetSave>(UGameplayStatics::LoadGameFromSlot(SlotName,0));
    if (!Save) Save=NewObject<UTibetSave>(this);
    // A normal app launch opens stupa. Explicit test slots and epilogue returns start the named map.
    if (Map==TEXT("stupa") && Order.Contains(Save->Map) && Save->Map!=Map
        && !FParse::Param(FCommandLine::Get(),TEXT("TibetNoResume")) && !FParse::Param(FCommandLine::Get(),TEXT("TibetDirect")))
    {
        bTravel=true;
        UGameplayStatics::OpenLevel(this,FName(*FString::Printf(TEXT("/Game/Maps/Tibet/%s"),*Save->Map)));
        return;
    }
    Health = MaxHealth();
    Mana = MaxMana();
    PlayerFeedback.ObjectiveTime = GetWorld()->GetTimeSeconds();
    Save->ResolveReturnOnArrival(Map);
    Route=Map;
    if (Map==TEXT("chimphu") && Save->bReturnFromTerma) Route=TEXT("return");
    if (Map==TEXT("stupa") && Save->bEpilogue) Route=TEXT("ending");
    Save->Map=Map;
    Save->Steps.FindOrAdd(Route)=FMath::Clamp(GetStep(),0,Routes().FindChecked(Route).Num());
    Save->Counts.FindOrAdd(Route)=FMath::Clamp(GetStepProgress(),0,Objective(Route,GetStep()).Count-1);
    if (Map==TEXT("stupa")) Save->ReconcileLampQuest();
    // A zero-step checkpoint also records a visit. Read old save slots without
    // a schema change, including the first frame of a direct level launch.
    FurthestMap = Order.IndexOfByKey(Map);
    for (int32 I = FurthestMap + 1; I < Order.Num(); ++I)
        if (Save->Steps.Contains(Order[I])) FurthestMap = I;
    TArray<AActor*> Markers;
    UGameplayStatics::GetAllActorsWithTag(this, TEXT("TibetPassage"), Markers);
    for (const AActor* Marker : Markers)
        for (FName Name : Marker->Tags)
            if (Name != TEXT("TibetPassage")) PassageSockets.Add(Name, Marker->GetActorLocation());
    if (Map==TEXT("stupa"))
    {
        if (auto* Gate = GetWorld()->SpawnActor<ATibetTravelGate>(GroveGate, FRotator::ZeroRotator))
        {
            Gate->SetSidePath();
            SideGate = Gate;
        }
    }
    StartCourtyard();
    GetWorldTimerManager().SetTimer(ScoreTimer, this, &ATibetGameMode::RefreshScore, .5f, true, .01f);
    PopulateResidents();
    Store();
    Refresh();
}

void ATibetGameMode::PopulateResidents()
{
    UE_LOG(LogTemp, Display, TEXT("TIBET_RESIDENT_LEVEL map=%s route=%s"), *Map, *Route);
    for (const FResidentPlacement& Resident : CastPlacements)
    {
        if (Map != Resident.Map) continue;
        FVector Location = Resident.Home;
        const bool bBearer = FCString::Strcmp(Resident.Id, TEXT("messenger")) == 0;
        if (bBearer)
        {
            const int32 EscortStep = Routes().FindChecked(Route).IndexOfByPredicate(
                [](const FObjective& O){ return O.Kind == EObjective::Escort; });
            if (GetStep() > EscortStep) Location = MessengerDestination;
            else if (GetStep() == EscortStep && Save->bMessengerJoined)
            {
                // The player resumes at the trailhead on a level load.
                if (const APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0))
                    Location = FVector(Pawn->GetActorLocation().X + 85, Pawn->GetActorLocation().Y + 85, 0);
            }
        }
        // Authored cave sockets own the floor elevation of the raised sanctuary.
        const FVector* Marker = Resident.Marker ? PassageSockets.Find(FName(Resident.Marker)) : nullptr;
        if (Marker) Location = *Marker;
        // Some cave thresholds and shrine platforms sit above the generated ground plane.
        FHitResult Floor;
        const FCollisionObjectQueryParams StaticWorld(ECC_WorldStatic);
        if (!Marker && GetWorld()->LineTraceSingleByObjectType(Floor, Location + FVector(0,0,120),
            Location - FVector(0,0,120), StaticWorld) && Floor.ImpactNormal.Z >= .70)
            Location.Z = Floor.ImpactPoint.Z;
        const FString Path = FString::Printf(TEXT("/Game/Figures/%s.%s"), Resident.Model, Resident.Model);
        AActor* Actor = MeshActor(Location, Path, FVector::OneVector);
        if (!ensureMsgf(Actor, TEXT("Missing resident mesh %s"), *Path)) continue;
        Actor->SetActorRotation(FRotator(0,-90,0));
        Actor->Tags.Add(TEXT("TibetResident"));
        Actor->Tags.Add(FName(Resident.Id));
        Residents.Add(FName(Resident.Id), Actor);
        if (bBearer && Save->bMessengerJoined && Objective(Route,GetStep()).Kind == EObjective::Escort)
        {
            Messenger = Actor;
            bEscorting = true;
        }
        UE_LOG(LogTemp, Display, TEXT("TIBET_RESIDENT_READY id=%s model=%s actor=%u"), Resident.Id, Resident.Model, Actor->GetUniqueID());
    }
}

AActor* ATibetGameMode::ActiveResident() const
{
    const TCHAR* Id = Objective(Route, GetStep()).Resident;
    return Id ? Residents.FindRef(FName(Id)).Get() : nullptr;
}

int32 ATibetGameMode::GetStep() const { return Save ? Save->Steps.FindRef(Route) : 0; }
int32 ATibetGameMode::GetStepProgress() const { return Save ? Save->Counts.FindRef(Route) : 0; }
FName ATibetGameMode::GetObjectiveKind() const
{
    static const FName Kinds[]={TEXT("Talk"),TEXT("Kora"),TEXT("Interact"),TEXT("Reach"),TEXT("Combat"),
        TEXT("Boss"),TEXT("Escort"),TEXT("Gate")};
    return Kinds[int32(Objective(Route,GetStep()).Kind)];
}
FVector ATibetGameMode::Anchor() const
{
    const EObjective K=Objective(Route,GetStep()).Kind;
    const int32 Count=GetStepProgress();
    const int32 Step=GetStep();
    if (Map == Route && !PassageSockets.IsEmpty())
    {
        const FName Key = K == EObjective::Gate ? FName(TEXT("Gate")) : FName(*FString::Printf(TEXT("Step%d"), Step));
        if (const FVector* At = PassageSockets.Find(Key)) return *At;
        if (const FVector* At = PassageSockets.Find(FName(*FString::Printf(TEXT("Step%d_%d"), Step, Count)))) return *At;
    }
    if (Map==TEXT("grove") && K==EObjective::Interact) return FVector(1280,0,0);
    if (Map==TEXT("stupa") && K==EObjective::Interact)
        return StupaLampLocation(Save->NextUnlitLamp());
    if (Map==TEXT("pharping"))
    {
        if(Step==2) return FVector(1250+80*Count,-760+90*Count,0);
        if(Step==4 || Step==10) return FVector(Step==4?1430:2670,-50,0);
        if(Step==5) return FVector(2690+60*(Count%3),-180+54*Count,0);
        if(Step==8 && bEscorting) return MessengerDestination;
    }
    if (Map==TEXT("mangyul"))
    {
        if(Step==1) return FVector(-720+(Count/2)*250, (Count%2?1.:-1.)*(470+30*(Count%3)),0);
        if(Step>=2 && K!=EObjective::Gate) return FVector(1510+(Step%2)*120, -660+(Step%3)*120,0);
    }
    if (Map==TEXT("yarlung"))
    {
        if(Step==0) return FVector(1490,-1040,0);
        if(Step==2 || Step==3) return FVector(1550+140*(Count%2),580+145*(Count/2),0);
    }
    switch (K)
    {
    case EObjective::Talk: return {-1320,230,0};
    case EObjective::Kora:
    {
        // Eight ordered stops trace a clockwise circumambulation.
        const double A=(Count+4)*UE_TWO_PI/8;
        const bool Hub = Map==TEXT("stupa");
        return FVector((Hub ? 3400. : 3800.)+(Hub ? 2300. : 2700.)*FMath::Cos(A),
            (Hub ? 2300. : 3250.)*FMath::Sin(A),0);
    }
    case EObjective::Boss:
    case EObjective::Combat: return {-50+110.*(Count%3),-350+150.*(Count%4),0};
    case EObjective::Interact: return {-1100+200.*(Count%5),((Count%2)?-1.:1.)*340,0};
    case EObjective::Escort: return bEscorting ? FVector(520,-250,0) : FVector(-1300,230,0);
    case EObjective::Reach: return {380,(GetStep()%2?1.:-1.)*370,0};
    default: return {700,0,0};
    }
}
FVector ATibetGameMode::GetObjectiveLocation() const
{
    if (Focus) return Focus->GetActorLocation();
    if (AActor* Resident = ActiveResident()) return Resident->GetActorLocation();
    return Anchor();
}
FString ATibetGameMode::GetObjectiveText() const
{
    if (!Save) return {};
    if (IsCampaignComplete()) return Local(TEXT("The pilgrimage is complete."),TEXT("朝聖之旅已圓滿。"));
    const auto& Obj=Objective(Route,GetStep());
    FString S=Local(Obj.En,Obj.Zh);
    if (Obj.Count>1) S+=FString::Printf(TEXT("  %d/%d"),GetStepProgress(),Obj.Count);
    return S;
}
FString ATibetGameMode::AreaName() const
{
    return AreaName(CurrentAreaIndex());
}
int32 ATibetGameMode::CurrentAreaIndex() const
{
    return Order.IndexOfByKey(Map);
}
FString ATibetGameMode::AreaName(int32 Index) const
{
    return Order.IsValidIndex(Index) ? Local(EnglishNames[Index],ChineseNames[Index]) : FString();
}
bool ATibetGameMode::HasVisitedArea(int32 Index) const
{
    return Save && Order.IsValidIndex(Index) && Save->Steps.Contains(Order[Index]);
}
int32 ATibetGameMode::AtlasDestination(int32 Pin) const
{
    const int32 CaveEntrance = Order.IndexOfByKey(TEXT("terma1"));
    if (Pin < 0 || Pin > CaveEntrance) return INDEX_NONE;
    if (Pin == CaveEntrance)
    {
        // The atlas has one pin for three rooms. Return to the deepest visited room.
        for (int32 Room = Order.Num() - 1; Room >= CaveEntrance; --Room)
            if (HasVisitedArea(Room)) return Room;
    }
    return Pin;
}

bool ATibetGameMode::CanTravelFromAtlas(int32 Pin) const
{
    const int32 Dest = AtlasDestination(Pin);
    if (!Save || bTravel || !Order.IsValidIndex(Dest) || FMath::Min(CurrentAreaIndex(), Order.IndexOfByKey(TEXT("terma1"))) == Pin) return false;
    return Order[Dest] == TEXT("stupa") || Order[Dest] == TEXT("grove") || HasVisitedArea(Dest);
}

bool ATibetGameMode::TravelFromAtlas(int32 Pin)
{
    return CanTravelFromAtlas(Pin) && TravelToMap(Order[AtlasDestination(Pin)]);
}

bool ATibetGameMode::TravelToMap(const FString& Destination)
{
    if (!Save || bTravel || !Order.Contains(Destination)) return false;
    const FString PreviousMap = Save->Map;
    const int32 PreviousCharges = Save->PillCharges;
    Save->Map = Destination;
    if (Destination == TEXT("stupa")) Save->PillCharges = 4;
    if (!Store())
    {
        Save->Map = PreviousMap;
        Save->PillCharges = PreviousCharges;
        return false;
    }
    bTravel = true;
    if (auto* PC = GetWorld()->GetFirstPlayerController())
        if (auto* HUD = PC->GetHUD<ATibetHUD>()) HUD->CloseJournal();
    UGameplayStatics::OpenLevel(this, FName(*(TEXT("/Game/Maps/Tibet/") + Destination)));
    return true;
}

ATibetGameMode::EInteraction ATibetGameMode::InteractionAt(const FVector& PlayerLocation) const
{
    if (!Save || bTravel || IsCampaignComplete()) return EInteraction::None;
    const APawn* Pawn = UGameplayStatics::GetPlayerPawn(this,0);
    if (!Pawn) return EInteraction::None;
    const double Feet = PlayerLocation.Z - Pawn->GetSimpleCollisionHalfHeight();
    if (SideGate && FMath::Abs(Feet - GroveGate.Z) < 110 && FVector::Dist2D(PlayerLocation,GroveGate)<215 &&
        ClearSight(Pawn->GetPawnViewLocation(), GroveGate + FVector(0,0,135), SideGate))
        return EInteraction::Grove;
    if (FMath::Abs(Feet - GetObjectiveLocation().Z) > 110 || FVector::Dist2D(PlayerLocation,GetObjectiveLocation())>225 ||
        !OnObjectiveFloor(UGameplayStatics::GetPlayerPawn(this,0), Anchor())) return EInteraction::None;
    switch (Objective(Route,GetStep()).Kind)
    {
    case EObjective::Gate:
        return Focus && ClearSight(Pawn->GetPawnViewLocation(), GetObjectiveLocation() + FVector(0,0,135), Focus)
            ? EInteraction::Gate : EInteraction::None;
    case EObjective::Talk:
        if (auto* Target = ActiveResident())
        {
            FVector Center, Extent;
            Target->GetActorBounds(false, Center, Extent);
            if (ClearSight(Pawn->GetPawnViewLocation(), Center + FVector(0,0,.5 * Extent.Z), Target)) return EInteraction::Talk;
        }
        return EInteraction::None;
    case EObjective::Interact: return EInteraction::Use;
    default: return EInteraction::None;
    }
}
bool ATibetGameMode::ClearSight(const FVector& From, const FVector& To, const AActor* Target) const
{
    FCollisionQueryParams Query(SCENE_QUERY_STAT(TibetInteraction), false, Target);
    Query.AddIgnoredActor(UGameplayStatics::GetPlayerPawn(this,0));
    return !GetWorld()->LineTraceTestByChannel(From, To, ECC_Visibility, Query);
}

bool ATibetGameMode::GetInteractionCue(FVector& WorldAnchor) const
{
    const auto* PC = GetWorld()->GetFirstPlayerController();
    if (!PC || !PC->GetPawn()) return false;
    const EInteraction Action = InteractionAt(PC->GetPawn()->GetActorLocation());
    const AActor* Target = nullptr;
    if (Action == EInteraction::Talk) Target = ActiveResident();
    else if (Action == EInteraction::Grove) Target = SideGate;
    else if (Action == EInteraction::Gate) Target = Focus;
    if (!Target) return false;
    FVector Center, Extent, Eye;
    FRotator View;
    Target->GetActorBounds(false, Center, Extent);
    WorldAnchor = Center + FVector(0, 0, Extent.Z + 14);
    PC->GetPlayerViewPoint(Eye, View);
    return ClearSight(Eye, Center + FVector(0,0,.5 * Extent.Z), Target) && ClearSight(Eye, WorldAnchor, Target);
}
FString ATibetGameMode::ActionLabel(EInteraction Action) const
{
    switch (Action)
    {
    case EInteraction::Grove: return Local(TEXT("Visit the votive grove"),TEXT("前往行者塔林"));
    case EInteraction::Gate:
        if (Map==TEXT("stupa")) return Local(TEXT("Enter the northern wilderness"),TEXT("前往北郊原野"));
        if (Map==TEXT("grove")) return Local(TEXT("Return to Boudhanath"),TEXT("返回博達哈大佛塔"));
        return Local(TEXT("Cross the threshold"),TEXT("前往下一區"));
    case EInteraction::Talk:
        if (Map==TEXT("stupa")) return Local(TEXT("Talk to Lobsang"),TEXT("與洛桑交談"));
        return Local(TEXT("Talk"),TEXT("交談"));
    case EInteraction::Use:
        if (Map==TEXT("stupa")) return Local(TEXT("Light the butter lamp"),TEXT("點亮酥油燈"));
        if (Map==TEXT("grove")) return Local(TEXT("Consecrate the votive stupa"),TEXT("為小佛塔裝藏開光"));
        return Local(TEXT("Interact"),TEXT("操作"));
    default: return {};
    }
}
FString ATibetGameMode::Status(bool bTouchControls) const
{
    if (!Save) return {};
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    const int32 Meters=P ? FMath::RoundToInt(FVector::Dist2D(P->GetActorLocation(),GetObjectiveLocation())/100.) : 0;
    const auto K=Objective(Route,GetStep()).Kind;
    FString S=FString::Printf(TEXT("%s %d   ·   %d m"),*Local(TEXT("Life"),TEXT("體力")),FMath::CeilToInt(Health),Meters);
    if (K==EObjective::Boss || K==EObjective::Combat) S+=FString::Printf(TEXT("   ·   %s %d"),*EnemyLabel(),EnemyHealth);
    if (P)
    {
        const EInteraction Action=InteractionAt(P->GetActorLocation());
        if (AtButterLamp() && (Action==EInteraction::Use || Action==EInteraction::None))
        {
            S+=bTouchControls ? Local(TEXT("\nOffer a lamp or dedicate a prayer"),TEXT("\n可供燈或回向")) :
                Local(TEXT("\nE  Light & dedicate    F  Quick offering"),TEXT("\nE 點燈回向　F 快速供燈"));
        }
        else if (Action==EInteraction::Use)
        {
            S+=bTouchControls ? Local(TEXT("\nTap Act · "),TEXT("\n點選「互動」・")) : Local(TEXT("\nTap E · "),TEXT("\n輕按 E・"));
            S+=ActionLabel(Action);
        }
    }
    if (GetWorld()->GetTimeSeconds()<NoticeUntil) S+=TEXT("\n")+Notice;
    if (LastPackReward!=ETibetItem::Count && GetWorld()->GetTimeSeconds()<PackRewardUntil)
    {
        const auto& Item=TibetItemInfo(LastPackReward);
        S+=Local(TEXT("\nAdded to your pack · "),TEXT("\n收入行囊・"))+Local(Item.NameEn,Item.NameZh);
    }
    return S;
}
bool ATibetGameMode::Store()
{
    if (UGameplayStatics::SaveGameToSlot(Save,SlotName,0)) return true;
    UE_LOG(LogTemp,Error,TEXT("Tibet: checkpoint write failed in %s"),*Map);
    return false;
}
void UTibetSave::ResolveReturnOnArrival(const FString& Destination)
{
    // The journal allows a detour between finishing a chapter and reporting back.
    if (Destination == TEXT("chimphu") && Steps.FindRef(TEXT("terma3")) >= Routes().FindChecked(TEXT("terma3")).Num())
        bReturnFromTerma = true;
    if (Destination == TEXT("stupa") && Steps.FindRef(TEXT("return")) >= Routes().FindChecked(TEXT("return")).Num())
        bEpilogue = true;
}

int32 UTibetSave::NextUnlitLamp() const
{
    for (int32 I=0; I<SouthLampTable; ++I)
        if (!(ButterLampMask & (1u<<I))) return I;
    return INDEX_NONE;
}

bool UTibetSave::ReconcileLampQuest()
{
    const FString Stupa=TEXT("stupa");
    static const int32 LampStep=Routes().FindChecked(Stupa).IndexOfByPredicate(
        [](const FObjective& O){ return O.Kind==EObjective::Interact; });
    if (LampStep==INDEX_NONE) return false;
    const int32 Step=Steps.FindRef(Stupa), Count=Counts.FindRef(Stupa);
    if (!bUsesDistinctLamps)
    {
        // Older checkpoints counted bowls in order. Free offerings may have
        // lit other bowls as well. Convert that ordered prefix exactly once.
        const int32 Ordered=Step>LampStep ? 3 : (Step==LampStep ? FMath::Clamp(Count,0,3) : 0);
        ButterLampMask|=(1u<<Ordered)-1;
        bUsesDistinctLamps=true;
    }
    if (Step!=LampStep) return false;
    const int32 Lit=FMath::CountBits(uint32(ButterLampMask & 7u));
    if (Lit==3)
    {
        Steps.Add(Stupa,LampStep+1);
        Counts.Add(Stupa,0);
        return true;
    }
    if (Lit==Count) return false;
    Counts.Add(Stupa,Lit);
    return true;
}

void ATibetGameMode::RestoreStupaFlames()
{
    for (int32 I=0; I<3; ++I)
    {
        const uint8 Bit=1u<<I;
        if (!(Save->ButterLampMask & Bit) || (SpawnedLampMask & Bit)) continue;
        auto* Flame=GetWorld()->SpawnActor<ATibetButterFlame>(StupaLampLocation(I)+FVector(0,0,126.5),FRotator::ZeroRotator);
        if (!Flame) continue;
        Flame->LightCourtyardBowl();
        Flame->Tags.Add(TEXT("StupaLampFlame"));
        SpawnedLampMask |= Bit;
    }
}
int32 ATibetGameMode::NearestButterLamp(const FVector& Where) const
{
    int32 Result=INDEX_NONE;
    double Best=220;
    if (Map==TEXT("stupa"))
        for(int32 I=0;I<=SouthLampTable;++I)
        {
            const double D=FVector::Dist2D(Where,StupaLampLocation(I));
            if(D<Best) { Best=D; Result=I; }
        }
    return Result;
}
void ATibetGameMode::Refresh()
{
    CancelEnemyWindup();
    const auto K=Objective(Route,GetStep()).Kind;
    if (Map==TEXT("wild") && K==EObjective::Combat && !IsCampaignComplete())
    {
        RefreshWilderness(Objective(Route, GetStep()).Count - GetStepProgress());
        return;
    }
    if (!WildernessPack.IsEmpty()) RefreshWilderness(0);
    EnemyMaximum = 0;
    LastHitTime = -10;
    if (Focus) { Focus->Destroy(); Focus=nullptr; }
    if (Map==TEXT("stupa")) RestoreStupaFlames();
    if (Map == TEXT("pharping"))
    {
        const int32 Lit = GetStep() > 5 ? 7 : (GetStep() == 5 ? GetStepProgress() : 0);
        while (LitCaveLamps < Lit)
        {
            const FVector* Bowl = PassageSockets.Find(FName(*FString::Printf(TEXT("Step5_%d"), LitCaveLamps)));
            if (!Bowl || !GetWorld()->SpawnActor<ATibetButterFlame>(*Bowl + FVector(0,0,129),FRotator::ZeroRotator)) break;
            ++LitCaveLamps;
        }
    }
    if (IsCampaignComplete()) return;
    const FVector At=Anchor();
    if (K==EObjective::Talk || (K==EObjective::Escort && !bEscorting))
    {
        if (const AActor* Resident = ActiveResident())
            UE_LOG(LogTemp, Display, TEXT("TIBET_RESIDENT_ACTIVE id=%s actor=%u step=%d"),
                Objective(Route,GetStep()).Resident, Resident->GetUniqueID(), GetStep());
    }
    else if (K==EObjective::Combat || K==EObjective::Boss)
    {
        FString Model;
        if (Map==TEXT("yarlung")) Model=TEXT("RiverYak");
        else if (Map==TEXT("pharping")) Model=TEXT("DroughtSpirit");
        else if (Map==TEXT("mangyul") && K==EObjective::Boss) Model=TEXT("Tenma");
        else if (Map==TEXT("samye") && K==EObjective::Boss) Model=TEXT("Pehar");
        else if (Map==TEXT("wild") || Map==TEXT("mangyul")) Model=TEXT("SnowKing");
        else Model=TEXT("Guardian");
        EnemyMaximum = K==EObjective::Boss ? 9 : 3;
        EnemyHealth = EnemyMaximum;
        EnemyTrailing = EnemyHealth;
        HurtTimer=1.3f;
        const FString Path=FString::Printf(TEXT("/Game/Figures/%s.%s"),*Model,*Model);
        Focus=MeshActor(At,Path,FVector(K==EObjective::Boss?1.48:1));
        if (Focus) Focus->SetActorRotation(FRotator(0,-90,0));
        if (Focus && K==EObjective::Boss)
        {
            FActorSpawnParameters Spawn;
            Spawn.Owner=Focus;
            if (auto* Halo=GetWorld()->SpawnActor<ATibetBossHalo>(At+FVector(0,0,6), FRotator::ZeroRotator, Spawn))
                Halo->AttachToActor(Focus,FAttachmentTransformRules::KeepWorldTransform);
        }
    }
    else if (Map==TEXT("stupa") && (K==EObjective::Kora || K==EObjective::Interact))
    {
        // The level supplies the visible paving and lamp. Keep the HUD/interaction target.
        Focus=GetWorld()->SpawnActor<ATargetPoint>(At,FRotator::ZeroRotator);
    }
    else if (K==EObjective::Gate || (Route==TEXT("chimphu") && K==EObjective::Reach))
        Focus=GetWorld()->SpawnActor<ATibetTravelGate>(At,FRotator::ZeroRotator);
    else if ((Map==TEXT("pharping") && GetStep()==5) || (Map==TEXT("yarlung") && GetStep()==3))
        Focus=GetWorld()->SpawnActor<ATargetPoint>(At,FRotator::ZeroRotator);
    else
        Focus=MeshActor(At+FVector(0,0,10),Cylinder,FVector(.82,.82,.16),&Gold);
    UE_LOG(LogTemp,Display,TEXT("Tibet objective map=%s route=%s step=%d kind=%s count=%d"),
        *Map,*Route,GetStep(),*GetObjectiveKind().ToString(),GetStepProgress());
}
void ATibetGameMode::Advance()
{
    PlayerFeedback.ObjectiveTime = GetWorld()->GetTimeSeconds();
    const ETibetItem Rewards[] = {ETibetItem::Vajra, ETibetItem::Bell, ETibetItem::Map, ETibetItem::Robe};
    bool WasOwned[UE_ARRAY_COUNT(Rewards)];
    for (int32 I = 0; I < UE_ARRAY_COUNT(Rewards); ++I) WasOwned[I] = OwnsItem(Rewards[I]);
    if (++Save->Counts.FindOrAdd(Route)>=Objective(Route,GetStep()).Count)
    {
        Save->Counts[Route]=0;
        ++Save->Steps.FindOrAdd(Route);
        if (bEscorting)
        {
            UE_LOG(LogTemp, Display, TEXT("TIBET_RESIDENT_DELIVERED actor=%u"), Messenger->GetUniqueID());
            bEscorting=false;
            Save->bMessengerJoined=false;
            Messenger=nullptr;
        }
        if (Route==TEXT("ending")) Save->bComplete=true;
    }
    if (Route==TEXT("stupa")) Save->ReconcileLampQuest();
    for (int32 I = 0; I < UE_ARRAY_COUNT(Rewards); ++I)
    {
        if (!WasOwned[I] && OwnsItem(Rewards[I]))
        {
            LastPackReward = Rewards[I];
            PackRewardUntil = GetWorld()->GetTimeSeconds() + 5.f;
        }
    }
    Store();
    Refresh();
}
void ATibetGameMode::MoveToNextMap()
{
    const int32 Id=Order.IndexOfByKey(Map);
    FString Dest;
    if(Map==TEXT("stupa")) Dest=TEXT("wild");
    else if(Map==TEXT("grove")) Dest=TEXT("stupa");
    else if(Route==TEXT("return")) Dest=TEXT("stupa");
    else if(Map==TEXT("terma3")) Dest=TEXT("chimphu");
    else if(Order.IsValidIndex(Id+1)) Dest=Order[Id+1];
    TravelToMap(Dest);
}
bool ATibetGameMode::AtButterLamp() const
{
    const auto* Pawn=UGameplayStatics::GetPlayerPawn(this,0);
    return Pawn && NearestButterLamp(Pawn->GetActorLocation())!=INDEX_NONE;
}

void ATibetGameMode::OfferNearbyLamp()
{
    const auto* Pawn=UGameplayStatics::GetPlayerPawn(this,0);
    if (!Pawn) return;
    const int32 Lamp=NearestButterLamp(Pawn->GetActorLocation());
    if (Lamp!=INDEX_NONE) OfferButter(Lamp,true);
}

void ATibetGameMode::QuickPractice()
{
    if (!Save || bTravel) return;
    if (FeedingPanel()) { CloseFeeding(); return; }
    const auto* Pawn=UGameplayStatics::GetPlayerPawn(this,0);
    if (!Pawn) return;
    const int32 Lamp=NearestButterLamp(Pawn->GetActorLocation());
    if (Lamp!=INDEX_NONE) OfferButter(Lamp,false);
    else BeginFeeding();
}

void ATibetGameMode::OfferButter(int32 Lamp,bool bOpenDedication)
{
    if (!Save || bTravel) return;
    const bool bTable=Lamp==SouthLampTable;
    const bool bLit=bTable || (Save->ButterLampMask & (1u<<Lamp));
    // A held or repeated key must not refill a lamp every frame.
    const float Now=GetWorld()->GetTimeSeconds();
    if (!bLit || Now-LastButterOffer>=.6f)
    {
        LastButterOffer=Now;
        if (!bTable) Save->ButterLampMask |= 1u<<Lamp;
        RestoreStupaFlames();
        Mana=FMath::Min(MaxMana(),Mana+15.f);
        SetNotice(bLit ? Local(TEXT("Fresh butter feeds the flame."),TEXT("添入酥油，燈火明亮。")) :
            Local(TEXT("The butter lamp is lit."),TEXT("酥油燈亮起。")));
        if (Save->ReconcileLampQuest())
        {
            PlayerFeedback.ObjectiveTime=Now;
            Refresh();
        }
        Store();
    }
    if (bOpenDedication)
    {
        auto* PC=GetWorld()->GetFirstPlayerController();
        if (auto* HUD=PC?PC->GetHUD<ATibetHUD>():nullptr) HUD->ToggleJournal(ETibetPage::Dedication);
    }
}

void ATibetGameMode::Interact()
{
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    const EInteraction Action=InteractionAt(P->GetActorLocation());
    if (Action==EInteraction::Use || Action==EInteraction::None)
    {
        const int32 Lamp=NearestButterLamp(P->GetActorLocation());
        if (Lamp!=INDEX_NONE)
        {
            OfferButter(Lamp,true);
            return;
        }
        // The quest uses the same bowl and distance as quick offerings.
        if (Map==TEXT("stupa") && Action==EInteraction::Use) return;
        if (CanFeed() && Action==EInteraction::None) { BeginFeeding(); return; }
    }
    if (Action==EInteraction::Grove)
    {
        TravelToMap(TEXT("grove"));
        return;
    }
    if(Action==EInteraction::Gate) MoveToNextMap();
    if(Action==EInteraction::Talk || Action==EInteraction::Use)
    {
        Pulse(GetObjectiveLocation()+FVector(0,0,80),Gold,.6);
        if(Action==EInteraction::Talk)
        {
            BeginDialogue(GetStep());
        }
        Advance();
    }
}
void ATibetGameMode::BeginDialogue(int32 ObjectiveIndex)
{
    StopDialogue();
    DialogueIndex = ObjectiveIndex;
    const auto& Line = Objective(Route, ObjectiveIndex);
    Speaker = Local(Line.SpeakerEn, Line.SpeakerZh);
    Dialogue = Local(Line.SpeechEn, Line.SpeechZh);
    const int32 Limit = IsEnglish() ? 82 : 32;
    for (int32 Start = 0; Start < Dialogue.Len();)
    {
        PageStarts.Add(Start);
        int32 End = FMath::Min(Start + Limit, Dialogue.Len());
        if (End < Dialogue.Len())
        {
            // Keep English words and short phrases together, including their closing punctuation.
            int32 Space = 0;
            for (int32 I = End - 1; I > Start + Limit / 3; --I)
            {
                if (FChar::IsWhitespace(Dialogue[I]) && !Space) Space = I + 1;
                if (FCString::Strchr(TEXT("，。！？、；：,.!?;:—"), Dialogue[I])) { End = I + 1; Space = 0; break; }
            }
            if (Space) End = Space;
            while (End < Dialogue.Len() && FCString::Strchr(TEXT("」』）”"), Dialogue[End])) ++End;
        }
        Start = End;
    }
    bVoicePending = true;
    PageDeadline = GetWorld()->GetTimeSeconds() + 1.0 + DialoguePage().Len() / (IsEnglish() ? 14. : 4.);
    if (!bDialoguePaused) StartDialogueVoice();
}

void ATibetGameMode::StartDialogueVoice()
{
    bVoicePending = false;
    // Existing automated campaigns run unattended. Only the audio QA scenario opts into audible playback.
    if (FParse::Param(FCommandLine::Get(), TEXT("nosound")) ||
        (FApp::IsUnattended() && !FParse::Param(FCommandLine::Get(), TEXT("TibetQAVoice")))) return;
    bVoiceRequested = true;
    const auto Owner = TWeakObjectPtr<ATibetGameMode>(this);
    const uint32 Generation = VoiceGeneration;
    TibetVoice::Speak(TCHAR_TO_UTF8(*Dialogue), IsEnglish(), [Owner, Generation](int Offset) {
        AsyncTask(ENamedThreads::GameThread, [Owner, Generation, Offset] {
            if (Owner.IsValid() && Owner->VoiceGeneration == Generation) Owner->SetDialogueWord(Offset);
        });
    }, [Owner, Generation] {
        AsyncTask(ENamedThreads::GameThread, [Owner, Generation] {
            if (!Owner.IsValid() || Owner->VoiceGeneration != Generation) return;
            Owner->PageIndex = Owner->PageStarts.Num() - 1;
            Owner->PageDeadline = Owner->GetWorld()->GetTimeSeconds() + 1.4;
        });
    });
}

FString ATibetGameMode::DialoguePage() const
{
    if (!PageStarts.IsValidIndex(PageIndex)) return {};
    const int32 Start = PageStarts[PageIndex];
    const int32 End = PageStarts.IsValidIndex(PageIndex + 1) ? PageStarts[PageIndex + 1] : Dialogue.Len();
    return Dialogue.Mid(Start, End - Start).TrimStartAndEnd();
}

void ATibetGameMode::SetDialogueWord(int32 Offset)
{
    if (!bSpokenWord)
        UE_LOG(LogTemp, Display, TEXT("TIBET_VOICE playing language=%s speaker=%s"), IsEnglish() ? TEXT("en-US") : TEXT("zh-TW"), *Speaker);
    bSpokenWord = true;
    while (PageStarts.IsValidIndex(PageIndex + 1) && Offset >= PageStarts[PageIndex + 1]) ++PageIndex;
    // Allow a missing device finish callback to recover after its longest remaining clause.
    PageDeadline = GetWorld()->GetTimeSeconds() + 4. + (Dialogue.Len() - Offset) / (IsEnglish() ? 9. : 2.5);
}

void ATibetGameMode::TickDialogue()
{
    if (DialogueIndex == INDEX_NONE || bDialoguePaused || GetWorld()->GetTimeSeconds() < PageDeadline) return;
    if (bSpokenWord || !PageStarts.IsValidIndex(PageIndex + 1)) { StopDialogue(); return; }
    ++PageIndex;
    PageDeadline = GetWorld()->GetTimeSeconds() + 1.0 + DialoguePage().Len() / (IsEnglish() ? 14. : 4.);
}
void ATibetGameMode::PauseDialogue(bool Paused)
{
    bDialoguePaused = Paused;
    if (DialogueIndex == INDEX_NONE) return;
    if (!Paused && bVoicePending) StartDialogueVoice();
    else if (bVoiceRequested) TibetVoice::Pause(Paused);
}
void ATibetGameMode::StopDialogue()
{
    if (bVoiceRequested) TibetVoice::Stop();
    bVoiceRequested = false;
    ++VoiceGeneration;
    DialogueIndex = INDEX_NONE;
    PageStarts.Reset();
    Dialogue.Reset();
    Speaker.Reset();
    PageIndex = 0;
    bVoicePending = false;
    bSpokenWord = false;
}
void ATibetGameMode::EndPlay(const EEndPlayReason::Type Reason)
{
    GetWorldTimerManager().ClearTimer(ScoreTimer);
    StopDialogue();
    if (Save && !bTravel && !SlotName.IsEmpty()) Store();
    Super::EndPlay(Reason);
}

void ATibetGameMode::SetNotice(const FString& Line)
{
    Notice=Line; NoticeUntil=GetWorld()->GetTimeSeconds()+3.f;
}
void ATibetGameMode::Pulse(const FVector& At,const FLinearColor& Color,float Magnitude)
{
    for (int32 j=0;j<8;++j)
    {
        const double A=UE_TWO_PI*j/8;
        const FVector Offset(FMath::Cos(A)*48,FMath::Sin(A)*48,12.*(j%3));
        if(auto* Bead=MeshActor(At+Offset*Magnitude,Sphere,FVector(.11,.11,.22)*Magnitude,&Color))
            Bead->SetLifeSpan(.32f);
    }
}
bool ATibetGameMode::HasLearnedSkill(int32 Slot) const
{
    return Save && Slot >= 0 && Slot < UE_ARRAY_COUNT(Skills) && FurthestMap >= Skills[Slot].UnlockMap;
}

FTibetSkillState ATibetGameMode::GetSkillState(int32 Slot) const
{
    FTibetSkillState State;
    if (Slot < 0 || Slot >= UE_ARRAY_COUNT(Skills)) return State;
    const FRitualSkill& Skill = Skills[Slot];
    State.Name = Local(Skill.En, Skill.Zh);
    State.Binding = Slot == 0 ? Local(TEXT("Space"), TEXT("空白鍵")) : FString(Skill.Binding);
    State.bUnlocked = HasLearnedSkill(Slot);
    State.Cost = Skill.Cost;
    State.CooldownDuration = Skill.Recovery;
    State.CooldownRemaining = Cooldown[Slot];
    State.ActiveRemaining = Slot == 4 ? Shield : 0;
    return State;
}

bool ATibetGameMode::GetEnemyMeter(FTibetEnemyMeter& Meter) const
{
    if (EnemyMaximum > 0 && Focus)
    {
        FVector Center, Extent;
        Focus->GetActorBounds(false, Center, Extent);
        Meter.Anchor = Center + FVector(0, 0, Extent.Z + 23);
        Meter.Health = EnemyHealth;
        Meter.Maximum = EnemyMaximum;
        Meter.Trailing = EnemyTrailing;
        return true;
    }
    const float Elapsed = GetWorld()->GetTimeSeconds() - FinishTime;
    if (Elapsed >= .76f || FinishingMeter.Maximum == 0) return false;
    Meter = FinishingMeter;
    Meter.Trailing *= 1 - FMath::SmoothStep(.14f, .65f, Elapsed);
    return true;
}

void ATibetGameMode::CastSkill(int32 Slot)
{
    if (!Save || bTravel || IsCampaignComplete() || Slot<0 || Slot>=UE_ARRAY_COUNT(Skills)) return;
    auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    const FRitualSkill& Skill = Skills[Slot];
    if(!HasLearnedSkill(Slot))
    {
        SetNotice(Local(TEXT("Continue the pilgrimage to learn this skill."),TEXT("完成後續章節即可習得此法。"))); return;
    }
    if(Cooldown[Slot]>0 || Mana<Skill.Cost) return;
    Cooldown[Slot]=Skill.Recovery; Mana-=Skill.Cost;
    if (Slot == 4) Shield = 6;
    const FVector Player = P->GetActorLocation();
    if (!WildernessPack.IsEmpty()) UpdateWilderness(Player,0.f);
    const bool Hit = EnemyMaximum > 0 && Focus && Skill.Power > 0 &&
        FVector::Dist2D(Player, GetObjectiveLocation()) < Skill.Range;
    const FVector From = Player + FVector(0,0,30);
    FVector To = From + P->GetActorForwardVector() * 340;
    if (Hit)
    {
        FVector Center, Extent;
        Focus->GetActorBounds(false,Center,Extent);
        const FVector Outward = (Player - Center).GetSafeNormal2D();
        To = Center + Outward * FMath::Max(Extent.X,Extent.Y) * .84 + FVector(0,0,.16 * Extent.Z);
    }
    // The web spell system turns the pilgrim toward the acquired target for
    // bolts, phurbas and bells. Keep the player's independent camera heading.
    if (Hit && (Slot == 0 || Slot == 2 || Slot == 3))
        P->SetActorRotation((To - From).GetSafeNormal2D().Rotation());
    auto* Effect = GetWorld()->SpawnActor<ATibetRitualEffect>();
    if (Effect) Effect->Start(Slot, From, To, P, RitualMaterial);

    const int32 Before = EnemyMaximum > 0 ? EnemyHealth : 0;
    const int32 Damage = Hit ? FMath::Min(Before, Skill.Power + int(IsEquipped(ETibetItem::Vajra))) : 0;
    // Snapshot actual loss before advancing the route or replacing a defeated actor.
    const int32 After = Before - Damage;
    UE_LOG(LogTemp, Display,
        TEXT("TIBET_CAST slot=%d map=%s hit=%d mp=%.1f shield=%.1f before=%d after=%d damage=%d effect=%d"),
        Slot, *Map, Hit ? 1 : 0, Mana, Shield, Before, After, Damage, Effect ? 1 : 0);
    if (Damage == 0) return;
    if (!WildernessPack.IsEmpty())
    {
        const auto* Body = Focus->FindComponentByClass<UStaticMeshComponent>();
        if (Body && Body->GetStaticMesh())
            UE_LOG(LogTemp,Display,TEXT("TIBET_WILD_HIT model=%s before=%d after=%d loss=%d"),
                *Body->GetStaticMesh()->GetName(),Before,After,Damage);
    }
    EnemyHealth = After;
    LastHitTime = GetWorld()->GetTimeSeconds();
    if (Slot == 2 || Slot == 3)
    {
        Stun = 2;
        CancelEnemyWindup();
    }
    FTibetEnemyMeter Meter;
    GetEnemyMeter(Meter);
    DamageCues.Add({Meter.Anchor, Damage, LastHitTime});
    if (auto* Impact = GetWorld()->SpawnActor<ATibetRitualEffect>())
        Impact->StartImpact(To + (Player - To).GetSafeNormal2D() * 5, Player - To, Slot, After == 0, RitualMaterial);
    if (After == 0)
    {
        FinishingMeter = Meter;
        FinishTime = LastHitTime;
        Advance();
    }
}
void ATibetGameMode::Tick(float Dt)
{
    Super::Tick(Dt);
    TickDialogue();
    if(Save && !bTravel) UpdateClock(Dt);
    const float Now = GetWorld()->GetTimeSeconds();
    DamageCues.RemoveAll([Now](const FTibetDamageCue& Cue) { return Now - Cue.SpawnTime >= 1.05f; });
    if (Now - LastHitTime > .22f)
        EnemyTrailing = FMath::FInterpConstantTo(EnemyTrailing, EnemyHealth, Dt, FMath::Max(4.f, EnemyMaximum * 1.7f));
    if (!Save || bTravel || IsCampaignComplete()) return;
    auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    UpdatePills(Now);
    Mana=FMath::Min(MaxMana(),Mana+Dt*5);
    for(float& T:Cooldown) T=FMath::Max(0.f,T-Dt);
    Shield=FMath::Max(0.f,Shield-Dt); Stun=FMath::Max(0.f,Stun-Dt);
    const auto K=Objective(Route,GetStep()).Kind;
    if (!WildernessPack.IsEmpty()) UpdateWilderness(P->GetActorLocation(),Dt);
    const FVector ToPlayer=P->GetActorLocation()-GetObjectiveLocation();
    const double Dist=ToPlayer.Size2D();
    if (bEscorting && Messenger)
    {
        const FVector Delta=P->GetActorLocation()-Messenger->GetActorLocation();
        if(Delta.Size2D()>95 && Delta.Size2D()<1800)
        {
            Messenger->AddActorWorldOffset(Delta.GetSafeNormal2D()*FMath::Min<double>(Dt*470,Delta.Size2D()-90));
            Messenger->SetActorRotation(FRotator(0,Delta.Rotation().Yaw+90,0));
        }
    }
    if ((K==EObjective::Reach || K==EObjective::Kora || K==EObjective::Escort) && Dist<140 && OnObjectiveFloor(P,Anchor()))
    {
        if(K==EObjective::Escort && !bEscorting)
        {
            Messenger=ActiveResident();
            if (!Messenger) return;
            bEscorting=true;
            Save->bMessengerJoined=true;
            Store();
            Refresh();
        }
        else if(K==EObjective::Escort && Messenger && FVector::Dist2D(Messenger->GetActorLocation(),GetObjectiveLocation())>190)
        {
            SetNotice(Local(TEXT("Wait for the scripture bearer."),TEXT("稍候，持經者正趕上。")));
        }
        else Advance();
    }
    if (EnemyMaximum > 0 && Focus)
    {
        FRotator Pose = Focus->GetActorRotation();
        if (!bEnemyWindingUp && Stun <= 0 && Dist < 1600) Pose.Yaw = ToPlayer.Rotation().Yaw + 90;
        const float Phase = FMath::Clamp((Now - LastHitTime) / .32f, 0.f, 1.f);
        Pose.Roll = -18 * FMath::Sin(Phase * UE_PI) * (1 - Phase);
        Focus->SetActorRotation(Pose);
    }
    if ((K==EObjective::Combat || K==EObjective::Boss) && Focus && Stun<=0 && Dist<1600)
        UpdateEnemyAttack(*P, K == EObjective::Boss, Dt);
    else
    {
        CancelEnemyWindup();
        Health=FMath::Min(MaxHealth(),Health+Dt*2);
    }
}

void ATibetGameMode::CancelEnemyWindup()
{
    if (auto* Effect = WindupEffect.Get()) Effect->Destroy();
    WindupEffect.Reset();
    bEnemyWindingUp = false;
}

void ATibetGameMode::UpdateEnemyAttack(APawn& Player, bool bBoss, float Dt)
{
    constexpr float Radius = 200.f;
    constexpr float Windup = .5f;
    constexpr float Interval = 1.5f;
    const FVector Offset = Player.GetActorLocation() - Focus->GetActorLocation();
    const double Distance = Offset.Size2D();
    HurtTimer -= Dt;
    if (!bEnemyWindingUp)
    {
        if (Distance > 124)
            Focus->AddActorWorldOffset(Offset.GetSafeNormal2D() *
                FMath::Min<double>(Dt * PursuitSpeed(bBoss), Distance - 120));
        if (Distance >= Radius || HurtTimer > Windup) return;

        HurtTimer = Windup;
        bEnemyWindingUp = true;
        WindupEffect = GetWorld()->SpawnActor<ATibetRitualEffect>();
        if (auto* Effect = WindupEffect.Get())
            Effect->StartEnemyAttack(*Focus, false, bBoss, Radius, Windup, RitualMaterial);
        return;
    }
    if (HurtTimer > 0) return;

    // The attacker plants its feet through the tell. Check range again at release
    // so stepping outside the ring avoids damage and shielding only blocks injury.
    CancelEnemyWindup();
    HurtTimer = Interval;
    if (auto* Effect = GetWorld()->SpawnActor<ATibetRitualEffect>())
        Effect->StartEnemyAttack(*Focus, true, bBoss, Radius, Windup, RitualMaterial);
    if (Distance >= Radius || Shield > 0) return;
    const float Before = Health;
    Health = FMath::Max(0.f, Health - (bBoss ? 16.f : 8.f));
    PlayerFeedback.RecordHit(GetWorld()->GetTimeSeconds(), Before, Health);
    if (Health <= 0)
    {
        Player.TeleportTo(FVector(-2000,0,100),FRotator::ZeroRotator);
        Health=MaxHealth(); Mana=MaxMana(); HealTicks.Reset(); Refresh();
        SetNotice(Local(TEXT("Restored at the trailhead."),TEXT("已在登山口恢復。")));
    }
}

void ATibetGameMode::ChangeLanguage()
{
    if (!Save) return;
    Save->bEnglish=!Save->bEnglish;
    if (DialogueIndex != INDEX_NONE) BeginDialogue(DialogueIndex);
    Store();
}
