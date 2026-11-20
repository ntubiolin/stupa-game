#include "TibetGameMode.h"
#include "TibetCharacter.h"
#include "TibetHUD.h"
#include "TibetRitualEffect.h"
#include "Components/StaticMeshComponent.h"
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
struct FObjective { EObjective Kind; const TCHAR* En; const TCHAR* Zh; int32 Count; const TCHAR* SpeechEn; const TCHAR* SpeechZh; };
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

const FVector GroveGate(-1860,-480,0);
FVector StupaLampLocation(int32 Index)
{
    return FVector(1430+70*Index,-360+320*Index,0);
}
const FString Cylinder=TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
const FString Cone=TEXT("/Engine/BasicShapes/Cone.Cone");
const FString Sphere=TEXT("/Engine/BasicShapes/Sphere.Sphere");
const FLinearColor Gold(.87,.43,.065), Water(.04,.57,.58);
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
    if (Map==TEXT("stupa") && !Save->bEpilogue && Order.Contains(Save->Map) && Save->Map!=Map
        && !FParse::Param(FCommandLine::Get(),TEXT("TibetNoResume")) && !FParse::Param(FCommandLine::Get(),TEXT("TibetDirect")))
    {
        bTravel=true;
        UGameplayStatics::OpenLevel(this,FName(*FString::Printf(TEXT("/Game/Maps/Tibet/%s"),*Save->Map)));
        return;
    }
    Route=Map;
    if (Map==TEXT("chimphu") && Save->bReturnFromTerma) Route=TEXT("return");
    if (Map==TEXT("stupa") && Save->bEpilogue) Route=TEXT("ending");
    Save->Map=Map;
    Save->Steps.FindOrAdd(Route)=FMath::Clamp(GetStep(),0,Routes().FindChecked(Route).Num());
    Save->Counts.FindOrAdd(Route)=FMath::Clamp(GetStepProgress(),0,Objective(Route,GetStep()).Count-1);
    // A zero-step checkpoint also records a visit. Read old save slots without
    // a schema change, including the first frame of a direct level launch.
    FurthestMap = Order.IndexOfByKey(Map);
    for (int32 I = FurthestMap + 1; I < Order.Num(); ++I)
        if (Save->Steps.Contains(Order[I])) FurthestMap = I;
    if (Map==TEXT("stupa"))
    {
        MeshActor(GroveGate+FVector(0,0,12),Cylinder,FVector(1.8,1.8,.2),&Water);
    }
    Store();
    Refresh();
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
    if (Map==TEXT("grove") && K==EObjective::Interact) return FVector(1280,0,0);
    if (Map==TEXT("stupa") && K==EObjective::Interact)
        return StupaLampLocation(Count);
    if (Map==TEXT("pharping"))
    {
        if(Step==2) return FVector(1250+80*Count,-760+90*Count,0);
        if(Step==4 || Step==10) return FVector(Step==4?1430:2670,-50,0);
        if(Step==5) return FVector(2690+60*(Count%3),-180+54*Count,0);
        if(Step==6 || Step==9 || Step==12) return FVector(2760,-38,0);
        if(Step==8 && bEscorting) return FVector(1370,-65,0);
    }
    if (Map==TEXT("mangyul"))
    {
        if(Step==0) return FVector(1580,1290,0);
        if(Step==1) return FVector(-720+(Count/2)*250, (Count%2?1.:-1.)*(470+30*(Count%3)),0);
        if(Step>=2 && K!=EObjective::Gate) return FVector(1510+(Step%2)*120, -660+(Step%3)*120,0);
    }
    if (Map==TEXT("yarlung"))
    {
        if(Step==0 || Step==1) return FVector(1490,-1040,0);
        if(Step==2 || Step==3) return FVector(1550+140*(Count%2),580+145*(Count/2),0);
    }
    if (Map==TEXT("samye") && (Step==0 || Step==1 || Step==6 || Step==8))
        return FVector(1420,Step%2?210:-210,0);
    if (Map==TEXT("chimphu") && K==EObjective::Talk) return FVector(1570,-720,0);
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
FVector ATibetGameMode::GetObjectiveLocation() const { return Focus ? Focus->GetActorLocation() : Anchor(); }
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
ATibetGameMode::EInteraction ATibetGameMode::InteractionAt(const FVector& PlayerLocation) const
{
    if (!Save || bTravel || IsCampaignComplete()) return EInteraction::None;
    if (Map==TEXT("stupa") && FVector::Dist2D(PlayerLocation,GroveGate)<215) return EInteraction::Grove;
    if (FVector::Dist2D(PlayerLocation,GetObjectiveLocation())>225) return EInteraction::None;
    switch (Objective(Route,GetStep()).Kind)
    {
    case EObjective::Gate: return EInteraction::Gate;
    case EObjective::Talk: return EInteraction::Talk;
    case EObjective::Interact: return EInteraction::Use;
    default: return EInteraction::None;
    }
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
    if (K==EObjective::Boss || K==EObjective::Combat) S+=FString::Printf(TEXT("   ·   %s %d"),*Local(TEXT("Spirit"),TEXT("靈障")),EnemyHealth);
    if (P)
    {
        const EInteraction Action=InteractionAt(P->GetActorLocation());
        if (Action!=EInteraction::None)
        {
            S+=bTouchControls ? Local(TEXT("\nTap Act · "),TEXT("\n點選「互動」・")) : Local(TEXT("\nTap E · "),TEXT("\n輕按 E・"));
            S+=ActionLabel(Action);
        }
    }
    if (GetWorld()->GetTimeSeconds()<NoticeUntil) S+=TEXT("\n")+Notice;
    return S;
}
void ATibetGameMode::Store()
{
    if (!UGameplayStatics::SaveGameToSlot(Save,SlotName,0))
        UE_LOG(LogTemp,Error,TEXT("Tibet: checkpoint write failed in %s"),*Map);
}
void ATibetGameMode::RestoreStupaFlames()
{
    // The epilogue uses a different active route, so read the original stupa checkpoint.
    const auto& Stupa=Routes().FindChecked(Map);
    const int32 LampStep=Stupa.IndexOfByPredicate([](const FObjective& O){ return O.Kind==EObjective::Interact; });
    if (LampStep==INDEX_NONE) return;
    const int32 Step=Save->Steps.FindRef(Map);
    if (Step<LampStep) return;
    const int32 Count=Stupa[LampStep].Count;
    const int32 Lit=Step>LampStep ? Count : FMath::Clamp(Save->Counts.FindRef(Map),0,Count);
    const FLinearColor Flame(4.0,1.5,0.15);
    for (; LitStupaLamps<Lit; ++LitStupaLamps)
    {
        // The cone is centred on its origin. Its base meets the wick at 116.5 cm.
        AActor* WickFlame=MeshActor(StupaLampLocation(LitStupaLamps)+FVector(0,0,126.5),
            Cone,FVector(.13,.13,.20),&Flame);
        if (!WickFlame) break;
        WickFlame->Tags.Add(TEXT("StupaLampFlame"));
    }
}
void ATibetGameMode::Refresh()
{
    EnemyMaximum = 0;
    LastHitTime = -10;
    if (Focus) { Focus->Destroy(); Focus=nullptr; }
    if (Map==TEXT("stupa")) RestoreStupaFlames();
    if (IsCampaignComplete()) return;
    const auto K=Objective(Route,GetStep()).Kind;
    const FVector At=Anchor();
    if (K==EObjective::Talk || (K==EObjective::Escort && !bEscorting) || K==EObjective::Combat || K==EObjective::Boss)
    {
        const bool Fight=K==EObjective::Combat || K==EObjective::Boss;
        FString Model=Map==TEXT("chimphu") ? TEXT("Tsogyal") : TEXT("Guide");
        if (Fight)
        {
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
        }
        const FString Path=FString::Printf(TEXT("/Game/Figures/%s.%s"),*Model,*Model);
        Focus=MeshActor(At,Path,FVector(K==EObjective::Boss?1.48:1));
        if (Focus) Focus->SetActorRotation(FRotator(0,-90,0));
    }
    else if (Map==TEXT("stupa") && (K==EObjective::Kora || K==EObjective::Interact))
    {
        // The level supplies the visible paving and lamp. Keep the HUD/interaction target.
        Focus=GetWorld()->SpawnActor<ATargetPoint>(At,FRotator::ZeroRotator);
    }
    else
    {
        const bool Gate=K==EObjective::Gate;
        Focus=MeshActor(At+FVector(0,0,Gate?18:10),Cylinder,FVector(Gate?1.7:.82,Gate?1.7:.82,.16),Gate?&Water:&Gold);
    }
    UE_LOG(LogTemp,Display,TEXT("Tibet objective map=%s route=%s step=%d kind=%s count=%d"),
        *Map,*Route,GetStep(),*GetObjectiveKind().ToString(),GetStepProgress());
}
void ATibetGameMode::Advance()
{
    if (++Save->Counts.FindOrAdd(Route)>=Objective(Route,GetStep()).Count)
    {
        Save->Counts[Route]=0;
        ++Save->Steps.FindOrAdd(Route);
        bEscorting=false;
        if (Messenger) { Messenger->Destroy(); Messenger=nullptr; }
        if (Route==TEXT("ending")) Save->bComplete=true;
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
    else if(Route==TEXT("return")) {Dest=TEXT("stupa"); Save->bEpilogue=true;}
    else if(Map==TEXT("terma3")) {Dest=TEXT("chimphu"); Save->bReturnFromTerma=true;}
    else if(Order.IsValidIndex(Id+1)) Dest=Order[Id+1];
    if(Dest.IsEmpty()) return;
    Save->Map=Dest;
    Store();
    bTravel=true;
    UGameplayStatics::OpenLevel(this,FName(*FString::Printf(TEXT("/Game/Maps/Tibet/%s"),*Dest)));
}
void ATibetGameMode::Interact()
{
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    const EInteraction Action=InteractionAt(P->GetActorLocation());
    if (Action==EInteraction::Grove)
    {
        Save->Map=TEXT("grove"); Store(); bTravel=true;
        UGameplayStatics::OpenLevel(this,FName(TEXT("/Game/Maps/Tibet/grove")));
        return;
    }
    if(Action==EInteraction::Gate) MoveToNextMap();
    if(Action==EInteraction::Talk || Action==EInteraction::Use)
    {
        Pulse(GetObjectiveLocation()+FVector(0,0,80),Gold,.6);
        if(Action==EInteraction::Talk)
        {
            const auto& O=Objective(Route,GetStep());
            SetNotice(Local(O.SpeechEn,O.SpeechZh));
            NoticeUntil=GetWorld()->GetTimeSeconds()+12;
        }
        Advance();
    }
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
    const int32 Damage = Hit ? FMath::Min(Before, Skill.Power) : 0;
    // Snapshot actual loss before advancing the route or replacing a defeated actor.
    const int32 After = Before - Damage;
    UE_LOG(LogTemp, Display,
        TEXT("TIBET_CAST slot=%d map=%s hit=%d mp=%.1f shield=%.1f before=%d after=%d damage=%d effect=%d"),
        Slot, *Map, Hit ? 1 : 0, Mana, Shield, Before, After, Damage, Effect ? 1 : 0);
    if (Damage == 0) return;
    EnemyHealth = After;
    LastHitTime = GetWorld()->GetTimeSeconds();
    if (Slot == 2 || Slot == 3) Stun = 2;
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
    const float Now = GetWorld()->GetTimeSeconds();
    DamageCues.RemoveAll([Now](const FTibetDamageCue& Cue) { return Now - Cue.SpawnTime >= 1.05f; });
    if (Now - LastHitTime > .22f)
        EnemyTrailing = FMath::FInterpConstantTo(EnemyTrailing, EnemyHealth, Dt, FMath::Max(4.f, EnemyMaximum * 1.7f));
    if (!Save || bTravel || IsCampaignComplete()) return;
    auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    Mana=FMath::Min(100.f,Mana+Dt*5);
    for(float& T:Cooldown) T=FMath::Max(0.f,T-Dt);
    Shield=FMath::Max(0.f,Shield-Dt); Stun=FMath::Max(0.f,Stun-Dt);
    const auto K=Objective(Route,GetStep()).Kind;
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
    if ((K==EObjective::Reach || K==EObjective::Kora || K==EObjective::Escort) && Dist<140)
    {
        if(K==EObjective::Escort && !bEscorting)
        {
            Messenger=Focus;
            Focus=nullptr;
            bEscorting=true;
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
        if (Stun <= 0 && Dist < 1600) Pose.Yaw = ToPlayer.Rotation().Yaw + 90;
        const float Phase = FMath::Clamp((Now - LastHitTime) / .32f, 0.f, 1.f);
        Pose.Roll = -18 * FMath::Sin(Phase * UE_PI) * (1 - Phase);
        Focus->SetActorRotation(Pose);
    }
    if ((K==EObjective::Combat || K==EObjective::Boss) && Focus && Stun<=0 && Dist<1600)
    {
        const FVector Dir=ToPlayer.GetSafeNormal2D();
        if(Dist>124) Focus->AddActorWorldOffset(Dir*FMath::Min<double>(Dt*(K==EObjective::Boss?165:115),Dist-120));
        HurtTimer-=Dt;
        if(Dist<200 && HurtTimer<=0)
        {
            HurtTimer=1.5f;
            if(Shield<=0) Health-=K==EObjective::Boss?16:8;
            if(Health<=0)
            {
                P->TeleportTo(FVector(-2000,0,100),FRotator::ZeroRotator);
                Health=100; Mana=100; Refresh();
                SetNotice(Local(TEXT("Restored at the trailhead."),TEXT("已在登山口恢復。")));
            }
        }
    }
    else Health=FMath::Min(100.f,Health+Dt*2);
}
void ATibetGameMode::ChangeLanguage()
{
    if (!Save) return;
    Save->bEnglish=!Save->bEnglish;
    Store();
}
