#include "TibetGameMode.h"
#include "TibetCharacter.h"
#include "TibetHUD.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Character.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

namespace
{
enum class EObjective { Talk, Kora, Interact, Reach, Combat, Boss, Escort, Gate };
struct FObjective { EObjective Kind; const TCHAR* En; const TCHAR* Zh; int32 Count; };
const TMap<FString,TArray<FObjective>>& Routes()
{
    static const TMap<FString,TArray<FObjective>> Table = {
#include "TibetRoute.inl"
    };
    return Table;
}
const FObjective& Objective(const FString& Route, int32 Index)
{
    static const FObjective Gate{EObjective::Gate,TEXT("Cross the northern threshold"),TEXT("前往北側出入口"),1};
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

AActor* MeshActor(UWorld* World, const FVector& Pos, const FString& Path, const FVector& Scale,
                  const FLinearColor* Color=nullptr)
{
    auto* Mesh=LoadObject<UStaticMesh>(nullptr,*Path);
    if (!Mesh) return nullptr;
    auto* A=World->SpawnActor<AActor>();
    auto* C=NewObject<UStaticMeshComponent>(A);
    A->SetRootComponent(C);
    C->SetMobility(EComponentMobility::Movable);
    C->SetStaticMesh(Mesh);
    C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if (Color && C->GetMaterial(0))
    {
        auto* Mat = C->CreateDynamicMaterialInstance(0);
        Mat->SetVectorParameterValue(TEXT("Color"),*Color);
    }
    C->RegisterComponent();
    A->SetActorLocation(Pos);
    A->SetActorScale3D(Scale);
    return A;
}
const FString Cylinder=TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
const FString Sphere=TEXT("/Engine/BasicShapes/Sphere.Sphere");
const FLinearColor Gold(.87,.43,.065), Water(.04,.57,.58);
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
    switch (K)
    {
    case EObjective::Talk: return {-1320,230,0};
    case EObjective::Kora:
    {
        // Eight ordered stops trace a clockwise circumambulation.
        const double A=(Count+4)*UE_TWO_PI/8;
        const bool Hub = Map==TEXT("stupa");
        const double Radius = Hub ? 2000. : 1250.;
        return FVector((Hub ? 3400. : 3800.)+Radius*FMath::Cos(A),Radius*FMath::Sin(A),0);
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
    const int32 i=Order.IndexOfByKey(Map);
    return Order.IsValidIndex(i) ? Local(EnglishNames[i],ChineseNames[i]) : FString();
}
FString ATibetGameMode::Status() const
{
    if (!Save) return {};
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    const int32 Meters=P ? FMath::RoundToInt(FVector::Dist2D(P->GetActorLocation(),GetObjectiveLocation())/100.) : 0;
    const auto K=Objective(Route,GetStep()).Kind;
    FString S=FString::Printf(TEXT("%s %d   %s %d   ·   %d m"),*Local(TEXT("Life"),TEXT("體力")),FMath::CeilToInt(Health),
       *Local(TEXT("Mantra"),TEXT("法力")),FMath::FloorToInt(Mana),Meters);
    if (K==EObjective::Boss || K==EObjective::Combat) S+=FString::Printf(TEXT("   ·   %s %d"),*Local(TEXT("Spirit"),TEXT("靈障")),EnemyHealth);
    if (GetWorld()->GetTimeSeconds()<NoticeUntil) S+=TEXT("\n")+Notice;
    return S;
}
void ATibetGameMode::Store()
{
    if (!UGameplayStatics::SaveGameToSlot(Save,SlotName,0))
        UE_LOG(LogTemp,Error,TEXT("Tibet: checkpoint write failed in %s"),*Map);
}
void ATibetGameMode::Refresh()
{
    if (Focus) { Focus->Destroy(); Focus=nullptr; }
    if (IsCampaignComplete()) return;
    const auto K=Objective(Route,GetStep()).Kind;
    const FVector At=Anchor();
    if (K==EObjective::Talk || (K==EObjective::Escort && !bEscorting) || K==EObjective::Combat || K==EObjective::Boss)
    {
        const bool Fight=K==EObjective::Combat || K==EObjective::Boss;
        FString Model=TEXT("Guide");
        if (Fight)
        {
            if (Map==TEXT("yarlung")) Model=TEXT("RiverYak");
            else if (Map==TEXT("wild") || Map==TEXT("mangyul")) Model=TEXT("SnowKing");
            else Model=TEXT("Guardian");
            EnemyHealth=K==EObjective::Boss ? 9 : 3;
            HurtTimer=1.3f;
        }
        const FString Path=FString::Printf(TEXT("/Game/Figures/%s.%s"),*Model,*Model);
        Focus=MeshActor(GetWorld(),At,Path,FVector(K==EObjective::Boss?1.48:1));
        if (Focus) Focus->SetActorRotation(FRotator(0,90,0));
    }
    else
    {
        const bool Gate=K==EObjective::Gate;
        Focus=MeshActor(GetWorld(),At+FVector(0,0,Gate?18:10),Cylinder,FVector(Gate?1.7:.82,Gate?1.7:.82,.16),Gate?&Water:&Gold);
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
        if (Route==TEXT("ending")) Save->bComplete=true;
    }
    Store();
    Refresh();
}
void ATibetGameMode::MoveToNextMap()
{
    const int32 Id=Order.IndexOfByKey(Map);
    FString Dest;
    if(Route==TEXT("return")) {Dest=TEXT("stupa"); Save->bEpilogue=true;}
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
    if (!Save || bTravel || IsCampaignComplete()) return;
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P || FVector::Dist2D(P->GetActorLocation(),GetObjectiveLocation())>225) return;
    const auto K=Objective(Route,GetStep()).Kind;
    if(K==EObjective::Gate) MoveToNextMap();
    if(K==EObjective::Talk || K==EObjective::Interact)
    {
        Pulse(GetObjectiveLocation()+FVector(0,0,80),Gold,.6);
        if(K==EObjective::Talk) SetNotice(GetObjectiveText());
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
        if(auto* Bead=MeshActor(GetWorld(),At+Offset*Magnitude,Sphere,FVector(.11,.11,.22)*Magnitude,&Color))
            Bead->SetLifeSpan(.32f);
    }
}
void ATibetGameMode::CastSkill(int32 Slot)
{
    if (!Save || bTravel || IsCampaignComplete() || Slot<0 || Slot>6) return;
    const auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    const int32 Unlock[]={0,0,4,5,6,7,8};
    if(Order.IndexOfByKey(Map)<Unlock[Slot])
    {
        SetNotice(Local(TEXT("Continue the pilgrimage to learn this skill."),TEXT("完成後續章節即可習得此法。"))); return;
    }
    const float Costs[]={0,15,14,18,16,22,35}, Recovery[]={.35f,.85f,6,9,8,12,18};
    if(Cooldown[Slot]>0 || Mana<Costs[Slot]) return;
    Cooldown[Slot]=Recovery[Slot]; Mana-=Costs[Slot];
    const FLinearColor Colors[]={Water,Gold,{.15,.35,.95},{.95,.63,.12},{.90,.22,.50},{.38,.7,.25},{.71,.30,.85}};
    const auto K=Objective(Route,GetStep()).Kind;
    if(Slot==4) Shield=6;
    const float Ranges[]={1400,750,950,900,0,1150,1600};
    const int32 Power[]={1,2,3,3,0,4,6};
    const bool Hit=(K==EObjective::Boss || K==EObjective::Combat) && Slot!=4 &&
        FVector::Dist2D(P->GetActorLocation(),GetObjectiveLocation())<Ranges[Slot];
    const FVector From=P->GetActorLocation()+FVector(0,0,25);
    const FVector To=Hit ? GetObjectiveLocation()+FVector(0,0,105) : From+P->GetActorForwardVector()*300;
    if (Slot==0 || Slot==2)
    {
        for (int32 j=1;j<=5;++j)
            if(auto* Dot=MeshActor(GetWorld(),FMath::Lerp(From,To,j/5.),Sphere,FVector(.14),&Colors[Slot]))
                Dot->SetLifeSpan(.18f);
    }
    Pulse(Slot==4?From:To,Colors[Slot],Slot==1 || Slot==6?2.f:1.f);
    if (!Hit) return;
    if(Slot==2 || Slot==3) Stun=2;
    EnemyHealth-=Power[Slot];
    if(EnemyHealth<=0)
    {
        Pulse(To,FLinearColor(.88,.48,.72),2);
        Advance();
    }
}
void ATibetGameMode::Tick(float Dt)
{
    Super::Tick(Dt);
    if (!Save || bTravel || IsCampaignComplete()) return;
    auto* P=UGameplayStatics::GetPlayerPawn(this,0);
    if (!P) return;
    Mana=FMath::Min(100.f,Mana+Dt*5);
    for(float& T:Cooldown) T=FMath::Max(0.f,T-Dt);
    Shield=FMath::Max(0.f,Shield-Dt); Stun=FMath::Max(0.f,Stun-Dt);
    const auto K=Objective(Route,GetStep()).Kind;
    const FVector ToPlayer=P->GetActorLocation()-GetObjectiveLocation();
    const double Dist=ToPlayer.Size2D();
    if ((K==EObjective::Reach || K==EObjective::Kora || K==EObjective::Escort) && Dist<140)
    {
        if(K==EObjective::Escort && !bEscorting){bEscorting=true;Refresh();}
        else Advance();
    }
    if ((K==EObjective::Combat || K==EObjective::Boss) && Focus && Stun<=0 && Dist<1600)
    {
        const FVector Dir=ToPlayer.GetSafeNormal2D();
        Focus->SetActorRotation(FRotator(0,Dir.Rotation().Yaw-90,0));
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
