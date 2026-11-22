#include "../TibetGameMode.h"
#include "../TibetCombatExtras.h"
#include "../TibetRitualEffect.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/DefaultPawn.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/AutomationTest.h"
#include "Misc/Paths.h"
#include "ProceduralMeshComponent.h"

namespace
{
struct FScopedCombatTestWorld
{
    UWorld* World = nullptr;
    FName ContextHandle;

    FScopedCombatTestWorld()
    {
        World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("TibetCombatTestWorld"));
        if (GEngine && World)
        {
            FWorldContext& Ctx = GEngine->CreateNewWorldContext(EWorldType::Game);
            Ctx.SetCurrentWorld(World);
            ContextHandle = Ctx.ContextHandle;
            World->InitializeActorsForPlay(FURL());
            World->BeginPlay();
        }
    }

    ~FScopedCombatTestWorld()
    {
        if (World)
        {
            if (GEngine) GEngine->DestroyWorldContext(World);
            World->DestroyWorld(false);
        }
    }
};
} // namespace

struct FTibetCombatLootTestAccessor
{
    static void Configure(ATibetGameMode& Mode, UTibetSave* Save, const FString& MapName,
        int32 Step, int32 Count, const FString& Slot = TEXT("TibetPilgrimage-UnitTest-CombatLoot"))
    {
        Mode.Save = Save;
        Mode.Map = MapName;
        Mode.Route = MapName;
        Mode.SlotName = Slot;
        if (Save)
        {
            Save->Map = MapName;
            Save->Steps.Add(MapName, Step);
            Save->Counts.Add(MapName, Count);
        }
    }

    static FVector GetAnchor(const ATibetGameMode& Mode) { return Mode.Anchor(); }
    static FTibetCombatState& GetCombatState(ATibetGameMode& Mode) { return Mode.CombatExtras; }
    static void SetFocus(ATibetGameMode& Mode, AActor* InFocus, int32 MaxHp, float InitialHurtTimer = 0.2f)
    {
        Mode.Focus = InFocus;
        Mode.EnemyMaximum = MaxHp;
        Mode.EnemyHealth = MaxHp;
        Mode.EnemyTrailing = MaxHp;
        Mode.HurtTimer = InitialHurtTimer;
        Mode.bEnemyWindingUp = false;
    }
    static bool IsWindingUp(const ATibetGameMode& Mode) { return Mode.bEnemyWindingUp; }
    static void RunEnemyAttack(ATibetGameMode& Mode, APawn& Player, bool bBoss, float Dt)
    {
        Mode.UpdateEnemyAttack(Player, bBoss, Dt);
    }
    static void SetStats(ATibetGameMode& Mode, float Hp, float Mp, float InShield = 0.f)
    {
        Mode.Health = Hp;
        Mode.Mana = Mp;
        Mode.Shield = InShield;
    }
    static void SetCooldown(ATibetGameMode& Mode, int32 Slot, float Seconds)
    {
        if (Slot >= 0 && Slot < 7) Mode.Cooldown[Slot] = Seconds;
    }
    static float GetCooldown(const ATibetGameMode& Mode, int32 Slot)
    {
        return (Slot >= 0 && Slot < 7) ? Mode.Cooldown[Slot] : 0.f;
    }
    static const FString& GetNotice(const ATibetGameMode& Mode) { return Mode.Notice; }
};

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetMonsterGaitKinematicsTest, "Tibet.Combat.MonsterGaitAndKinematics",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetMonsterGaitKinematicsTest::RunTest(const FString&)
{
    // 1. Verify gait classification across all 9 figure species.
    TestEqual(TEXT("SnowMigoi is biped (0)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("SnowMigoi")), 0.f);
    TestEqual(TEXT("SnowKing is biped (0)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("SnowKing")), 0.f);
    TestEqual(TEXT("Guardian is biped (0)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("Guardian")), 0.f);
    TestEqual(TEXT("Tenma is biped (0)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("Tenma")), 0.f);

    TestEqual(TEXT("RiverYak is quadruped (1)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("RiverYak")), 1.f);
    TestEqual(TEXT("TsenRider is quadruped (1)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("TsenRider")), 1.f);
    TestEqual(TEXT("Pehar is quadruped (1)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("Pehar")), 1.f);

    TestEqual(TEXT("Preta is serpentine/spectral (2)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("Preta")), 2.f);
    TestEqual(TEXT("DroughtSpirit is serpentine/spectral (2)"), FTibetCombatExtras::ClassifyGaitMode(TEXT("DroughtSpirit")), 2.f);

    // 2. Verify live C++ stride kinematics, bounce, pitch/roll cadence, hit flash & CustomPrimitiveData[0..3].
    FScopedCombatTestWorld Scoped;
    TestNotNull(TEXT("Test world created"), Scoped.World);
    if (!Scoped.World) return false;

    auto* Mode = Scoped.World->SpawnActor<ATibetGameMode>();
    AActor* Monster = Scoped.World->SpawnActor<AActor>(FVector(100, 0, 0), FRotator(0, -90, 0));
    auto* MeshComp = NewObject<UStaticMeshComponent>(Monster);
    Monster->SetRootComponent(MeshComp);
    MeshComp->SetMobility(EComponentMobility::Movable);
    MeshComp->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere")));
    MeshComp->RegisterComponent();
    Monster->SetActorLocationAndRotation(FVector(100, 0, 0), FRotator(0, -90, 0));
    Monster->Tags.Add(TEXT("tsen"));

    FTibetCombatState& State = FTibetCombatLootTestAccessor::GetCombatState(*Mode);
    FTibetCombatExtras::UpdateMonsterKinematics(*Mode, State, *Monster, 0.f, 0.05f);

    // Translate monster 120 cm over 6 frames (20 cm per 0.1s -> 200 cm/s)
    for (int32 Step = 0; Step < 6; ++Step)
    {
        Monster->AddActorWorldOffset(FVector(20.f, 0.f, 0.f));
        FTibetCombatExtras::UpdateMonsterKinematics(*Mode, State, *Monster, 0.f, 0.1f);
    }

    const FTibetMonsterAnimState* Anim = State.MonsterAnims.Find(Monster);
    TestNotNull(TEXT("Monster anim state tracked"), Anim);
    if (Anim)
    {
        TestNearlyEqual(TEXT("WalkPhase tracks MovedDist * 0.055"), Anim->WalkPhase, 120.f * 0.055f, 1e-3f);
        TestTrue(TEXT("StrideAmp ramps up during movement"), Anim->StrideAmp > 0.8f);
        TestEqual(TEXT("Actor tag 'tsen' selects quadruped GaitMode=1"), Anim->GaitMode, 1.f);
    }
    TestTrue(TEXT("Monster Z lifts off ground with stride bounce"), Monster->GetActorLocation().Z > 0.2);
    TestTrue(TEXT("Monster stride adds non-zero cadence tilt"),
        !FMath::IsNearlyZero(Monster->GetActorRotation().Pitch, 1e-2) ||
        !FMath::IsNearlyZero(Monster->GetActorRotation().Roll, 1e-2));

    const TArray<float>& Cpd = MeshComp->GetCustomPrimitiveData().Data;
    TestTrue(TEXT("CustomPrimitiveData populated for indices 0..3"), Cpd.Num() >= 4);
    if (Cpd.Num() >= 4)
    {
        TestNearlyEqual(TEXT("CPD[0] matches WalkPhase"), Cpd[0], 120.f * 0.055f, 1e-3f);
        TestTrue(TEXT("CPD[1] StrideAmp > 0.8"), Cpd[1] > 0.8f);
        TestEqual(TEXT("CPD[2] GaitMode == 1"), Cpd[2], 1.f);
    }

    // Record hit -> verify HitFlash=1, knockback 22 cm, and squash-and-stretch punch!
    const double XBeforeHit = Monster->GetActorLocation().X;
    FTibetCombatExtras::RecordMonsterHit(State, *Monster, FVector(0, 0, 0), true);
    TestNearlyEqual(TEXT("Knockback jolts monster 22 cm away from Pilgrim"),
        float(Monster->GetActorLocation().X - XBeforeHit), 22.f, 0.1f);
    TestEqual(TEXT("CPD[3] HitFlash spikes to 1.0 on hit"), MeshComp->GetCustomPrimitiveData().Data[3], 1.0f);

    FTibetCombatExtras::UpdateMonsterKinematics(*Mode, State, *Monster, -12.f, 0.02f);
    TestTrue(TEXT("Squash-and-stretch widens X/Y and compresses Z on hit"),
        Monster->GetActorScale3D().X > 1.06 && Monster->GetActorScale3D().Z < 0.95);

    // Stop moving -> StrideAmp and HitFlash decay cleanly to zero
    for (int32 Step = 0; Step < 20; ++Step)
        FTibetCombatExtras::UpdateMonsterKinematics(*Mode, State, *Monster, 0.f, 0.1f);
    TestNearlyEqual(TEXT("Stopped monster decays StrideAmp to 0"), MeshComp->GetCustomPrimitiveData().Data[1], 0.f, 0.02f);
    TestNearlyEqual(TEXT("HitFlash decays back to 0"), MeshComp->GetCustomPrimitiveData().Data[3], 0.f, 1e-4f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetDiverseSpawnLocationsTest, "Tibet.Combat.DiverseSpawnLocations",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetDiverseSpawnLocationsTest::RunTest(const FString&)
{
    TestEqual(TEXT("Northern Wilderness defines 10 varied camps"), FTibetCombatExtras::WildernessCampCount(), 10);
    double MinX = MAX_dbl, MaxX = -MAX_dbl, MinY = MAX_dbl, MaxY = -MAX_dbl;
    for (int32 I = 0; I < FTibetCombatExtras::WildernessCampCount(); ++I)
    {
        const FVector A = FTibetCombatExtras::WildernessCamp(I);
        MinX = FMath::Min(MinX, A.X); MaxX = FMath::Max(MaxX, A.X);
        MinY = FMath::Min(MinY, A.Y); MaxY = FMath::Max(MaxY, A.Y);
        for (int32 J = I + 1; J < FTibetCombatExtras::WildernessCampCount(); ++J)
        {
            const FVector B = FTibetCombatExtras::WildernessCamp(J);
            TestTrue(FString::Printf(TEXT("Wilderness camps %d and %d separated >= 240 cm"), I, J),
                FVector::Dist2D(A, B) >= 240.0);
        }
    }
    TestTrue(TEXT("Wilderness camps span > 1900 cm north-south"), MaxX - MinX > 1900.0);
    TestTrue(TEXT("Wilderness camps span > 750 cm east-west"), MaxY - MinY > 750.0);

    auto* Save = NewObject<UTibetSave>();
    auto* Mode = NewObject<ATibetGameMode>();

    // Pharping Step 1: 6 Drought Sprites around the 3 Naga Springs
    TArray<FVector> PharpingPts;
    for (int32 C = 0; C < 6; ++C)
    {
        FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("pharping"), 1, C);
        const FVector Pt = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
        for (const FVector& Prev : PharpingPts)
            TestTrue(TEXT("Pharping spring sprites have distinct positions"), FVector::Dist2D(Pt, Prev) >= 200.0);
        PharpingPts.Add(Pt);
    }

    // Yarlung Step 4: 15 rampaging wild yaks spread across valley meadows clear of river (Y=1450)
    TArray<FVector> YarlungPts;
    for (int32 C = 0; C < 15; ++C)
    {
        FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("yarlung"), 4, C);
        const FVector Pt = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
        TestTrue(TEXT("Yarlung yak stays clear of river at Y=1450"), Pt.Y < 850.0);
        for (const FVector& Prev : YarlungPts)
            TestTrue(TEXT("All 15 Yarlung yak spawns are distinct"), FVector::Dist2D(Pt, Prev) >= 180.0);
        YarlungPts.Add(Pt);
    }

    // Samye Step 2 (3 Night Defense waves) & Terma1 Step 1 (3 Cave Sentinels)
    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("samye"), 2, 0);
    const FVector Samye0 = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("samye"), 2, 1);
    const FVector Samye1 = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
    TestTrue(TEXT("Samye night defense waves flank opposite perimeter sides"), FVector::Dist2D(Samye0, Samye1) > 1500.0);

    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("terma1"), 1, 0);
    const FVector TermaA = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("terma1"), 1, 2);
    const FVector TermaB = FTibetCombatLootTestAccessor::GetAnchor(*Mode);
    TestTrue(TEXT("Terma1 cave sentinels span cavern nave"), FVector::Dist2D(TermaA, TermaB) > 1200.0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetTsenRiderArrowProjectileTest, "Tibet.Combat.TsenRiderArrowProjectile",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetTsenRiderArrowProjectileTest::RunTest(const FString&)
{
    FScopedCombatTestWorld Scoped;
    if (!Scoped.World) return false;

    const FString Slot = TEXT("TibetPilgrimage-UnitTest-TsenArrow");
    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    auto* Save = NewObject<UTibetSave>();
    auto* Mode = Scoped.World->SpawnActor<ATibetGameMode>();
    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("wild"), 0, 0, Slot);
    FTibetCombatLootTestAccessor::SetStats(*Mode, 100.f, 100.f, 0.f);

    APawn* Pilgrim = Scoped.World->SpawnActor<ADefaultPawn>(FVector(0, 0, 90), FRotator::ZeroRotator);
    AActor* Archer = Scoped.World->SpawnActor<AActor>(FVector(740, 0, 0), FRotator(0, -90, 0));
    auto* ArcherMesh = NewObject<UStaticMeshComponent>(Archer);
    Archer->SetRootComponent(ArcherMesh);
    ArcherMesh->SetMobility(EComponentMobility::Movable);
    ArcherMesh->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cylinder.Cylinder")));
    ArcherMesh->RegisterComponent();
    Archer->SetActorLocation(FVector(740, 0, 0));
    Archer->Tags.Add(TEXT("tsen"));

    TestTrue(TEXT("IsRangedArcher detects 'tsen' tag"), FTibetCombatExtras::IsRangedArcher(Archer));
    FTibetCombatLootTestAccessor::SetFocus(*Mode, Archer, 3, 0.1f);

    // 1. Approach & Windup at ranged standoff (740 cm < 920 cm RangedAttackRadius)
    FTibetCombatLootTestAccessor::RunEnemyAttack(*Mode, *Pilgrim, false, 0.1f);
    TestTrue(TEXT("TsenRider enters ranged windup without hugging melee"), FTibetCombatLootTestAccessor::IsWindingUp(*Mode));
    TestTrue(TEXT("TsenRider maintains standoff > 550 cm"), FVector::Dist2D(Archer->GetActorLocation(), Pilgrim->GetActorLocation()) > 550.0);

    bool bFoundWindupAtArcher = false;
    for (TActorIterator<ATibetRitualEffect> It(Scoped.World); It; ++It)
    {
        if (It->GetEffectSlot() == ATibetRitualEffect::EnemyWindup)
        {
            const auto* Proc = Cast<UProceduralMeshComponent>(It->GetRootComponent());
            bFoundWindupAtArcher = (It->GetOwner() == Archer) &&
                FVector::Dist2D(It->GetActorLocation(), Archer->GetActorLocation()) <= 30.0 &&
                Proc && Proc->GetNumSections() == 2;
        }
    }
    TestTrue(TEXT("Windup effect spawns at TsenRider with 2 sections for QA invariant"), bFoundWindupAtArcher);

    // 2. Release bow -> spawns EnemyStrike at Archer AND 3D Spirit Arrow with ZERO instant hitscan damage!
    FTibetCombatLootTestAccessor::RunEnemyAttack(*Mode, *Pilgrim, false, 0.6f);
    TestFalse(TEXT("Windup finished at arrow release"), FTibetCombatLootTestAccessor::IsWindingUp(*Mode));
    TestEqual(TEXT("No instant melee hitscan damage on bow release frame"), Mode->GetHealth(), 100.f);

    FTibetCombatState& State = FTibetCombatLootTestAccessor::GetCombatState(*Mode);
    TestEqual(TEXT("One 3D flying spirit arrow spawned"), State.Arrows.Num(), 1);

    // 3. Advance arrow flight into stationary Pilgrim -> deals 9 damage!
    for (int32 Step = 0; Step < 20 && !State.Arrows.IsEmpty(); ++Step)
        FTibetCombatExtras::TickArrows(*Mode, State, Pilgrim, 0.05f);

    TestEqual(TEXT("Arrow destroyed upon hitting Pilgrim"), State.Arrows.Num(), 0);
    TestEqual(TEXT("Spirit arrow deals 9 ranged damage"), Mode->GetHealth(), 91.f);
    TestEqual(TEXT("PlayerFeedback records 9 health loss"), Mode->GetPlayerFeedback().Loss, 9);

    // 4. Fire a second arrow and dodge Pilgrim sideways -> 0 damage taken & clean expiry!
    FTibetCombatExtras::SpawnArrowProjectile(*Mode, State, FVector(680, 0, 148), FVector(0, 0, 102));
    TestEqual(TEXT("Second arrow in flight"), State.Arrows.Num(), 1);
    Pilgrim->SetActorLocation(FVector(0, 260, 90));
    for (int32 Step = 0; Step < 32; ++Step)
        FTibetCombatExtras::TickArrows(*Mode, State, Pilgrim, 0.05f);

    TestEqual(TEXT("Sideways dodge avoids flying arrow completely"), Mode->GetHealth(), 91.f);
    TestEqual(TEXT("Missed arrow expires cleanly after 1.35s"), State.Arrows.Num(), 0);

    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetMonsterLootDropsTest, "Tibet.Combat.MonsterLootDropsAndMagnet",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetMonsterLootDropsTest::RunTest(const FString&)
{
    FScopedCombatTestWorld Scoped;
    if (!Scoped.World) return false;

    const FString Slot = TEXT("TibetPilgrimage-UnitTest-LootDrops");
    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    auto* Save = NewObject<UTibetSave>();
    Save->PillCharges = 2;
    auto* Mode = Scoped.World->SpawnActor<ATibetGameMode>();
    FTibetCombatLootTestAccessor::Configure(*Mode, Save, TEXT("wild"), 0, 0, Slot);
    FTibetCombatLootTestAccessor::SetStats(*Mode, 70.f, 50.f, 0.f);

    APawn* Pilgrim = Scoped.World->SpawnActor<ADefaultPawn>(FVector(0, 0, 90), FRotator::ZeroRotator);
    FTibetCombatState& State = FTibetCombatLootTestAccessor::GetCombatState(*Mode);

    // 1. Ordinary drop #0 (Amrita Pill) within 240 cm -> immediate pickup (+1 PillCharge, +12 HP)
    AActor* Drop0 = FTibetCombatExtras::SpawnLootDrop(*Mode, State, FVector(160, 0, 0), false);
    TestNotNull(TEXT("3D Amrita loot actor spawned"), Drop0);
    TestEqual(TEXT("Loot spawns at GroundZ + 48 cm"), float(State.LootDrops[0].BaseZ), 48.f);
    FTibetCombatExtras::TickLootDrops(*Mode, State, Pilgrim, 0.05f);
    TestEqual(TEXT("Close-range loot collected immediately"), State.LootDrops.Num(), 0);
    TestEqual(TEXT("Amrita Pill drop restores +1 PillCharge (2 -> 3)"), Mode->Pills(), 3);
    TestEqual(TEXT("Amrita Pill drop heals +12 HP (70 -> 82)"), Mode->GetHealth(), 82.f);
    TestTrue(TEXT("Chinese pickup notice names 甘露丸"),
        FTibetCombatLootTestAccessor::GetNotice(*Mode).Contains(TEXT("甘露丸")));

    // 2. Ordinary drop #1 (Mantra Mani Pearl) at ranged distance 760 cm -> hovers < 2.8s, then magnets at 950 cm/s!
    FTibetCombatLootTestAccessor::SetStats(*Mode, 70.f, 50.f, 0.f);
    AActor* Drop1 = FTibetCombatExtras::SpawnLootDrop(*Mode, State, FVector(760, 0, 0), false);
    TestNotNull(TEXT("3D Mani Pearl loot actor spawned"), Drop1);

    for (int32 Step = 0; Step < 20; ++Step)
        FTibetCombatExtras::TickLootDrops(*Mode, State, Pilgrim, 0.1f); // Age = 2.0s < 2.8s
    TestEqual(TEXT("Ranged loot hovers in place before 2.8s magnet delay"), State.LootDrops.Num(), 1);
    TestNearlyEqual(TEXT("Ranged loot X unchanged before magnet delay"), float(State.LootDrops[0].Position.X), 760.f, 1.f);

    for (int32 Step = 0; Step < 20 && !State.LootDrops.IsEmpty(); ++Step)
        FTibetCombatExtras::TickLootDrops(*Mode, State, Pilgrim, 0.1f); // Age crosses 2.8s and homes in!
    TestEqual(TEXT("Ranged loot magnetically flies into Pilgrim pack"), State.LootDrops.Num(), 0);
    TestEqual(TEXT("Mani Pearl restores +24 MP (50 -> 74)"), Mode->GetMana(), 74.f);
    TestEqual(TEXT("Mani Pearl restores +10 HP (70 -> 80)"), Mode->GetHealth(), 80.f);
    TestTrue(TEXT("Chinese pickup notice names 真言摩尼寶珠"),
        FTibetCombatLootTestAccessor::GetNotice(*Mode).Contains(TEXT("真言摩尼寶珠")));

    // 3. Boss drop (Dharma Protector Relic) -> +45 HP, +50 MP, +2 Amrita (clamped <= 4), resets cooldowns, 0 PointLights!
    Save->PillCharges = 1;
    FTibetCombatLootTestAccessor::SetStats(*Mode, 40.f, 30.f, 0.f);
    FTibetCombatLootTestAccessor::SetCooldown(*Mode, 2, 5.5f);
    FTibetCombatLootTestAccessor::SetCooldown(*Mode, 6, 14.0f);
    AActor* BossDrop = FTibetCombatExtras::SpawnLootDrop(*Mode, State, FVector(120, 0, 0), true);
    TestNotNull(TEXT("3D Boss Relic actor spawned"), BossDrop);

    int32 PointLights = 0;
    for (TObjectIterator<UPointLightComponent> It; It; ++It)
        if (It->GetWorld() == Scoped.World) ++PointLights;
    TestEqual(TEXT("Zero PointLights added by loot or combat VFX"), PointLights, 0);

    FTibetCombatExtras::TickLootDrops(*Mode, State, Pilgrim, 0.05f);
    TestEqual(TEXT("Boss Relic heals +45 HP (40 -> 85)"), Mode->GetHealth(), 85.f);
    TestEqual(TEXT("Boss Relic restores +50 MP (30 -> 80)"), Mode->GetMana(), 80.f);
    TestEqual(TEXT("Boss Relic grants +2 Amrita Pills (1 -> 3)"), Mode->Pills(), 3);
    TestEqual(TEXT("Boss Relic resets Phurba cooldown"), FTibetCombatLootTestAccessor::GetCooldown(*Mode, 2), 0.f);
    TestEqual(TEXT("Boss Relic resets Guru cooldown"), FTibetCombatLootTestAccessor::GetCooldown(*Mode, 6), 0.f);
    TestTrue(TEXT("Chinese pickup notice names 護法加持寶珠"),
        FTibetCombatLootTestAccessor::GetNotice(*Mode).Contains(TEXT("護法加持寶珠")));

    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetCombatSfxAssetsAndFallbackTest, "Tibet.Combat.SfxAssetsAndFallback",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetCombatSfxAssetsAndFallbackTest::RunTest(const FString&)
{
    const FString SfxDir = FPaths::ProjectDir() / TEXT("Assets/SFX");
    for (int32 I = 0; I < int32(ETibetSfx::Count); ++I)
    {
        const ETibetSfx Cue = ETibetSfx(I);
        const TCHAR* Name = FTibetCombatExtras::SfxAssetName(Cue);
        const FString WavFile = SfxDir / (FString(Name) + TEXT(".wav"));
        TestTrue(FString::Printf(TEXT("Generated WAV exists on disk: %s"), *WavFile), FPaths::FileExists(WavFile));

        const TArray<int16>& Pcm = FTibetCombatExtras::GetOrBuildProceduralPcm(Cue);
        TestTrue(FString::Printf(TEXT("Procedural PCM for %s has >= 8000 samples"), Name), Pcm.Num() >= 8000);
        int32 Peak = 0;
        for (int16 Sample : Pcm) Peak = FMath::Max(Peak, FMath::Abs(int32(Sample)));
        TestTrue(FString::Printf(TEXT("Procedural PCM for %s is non-silent"), Name), Peak > 6000);
        TestEqual(FString::Printf(TEXT("Procedural PCM for %s starts click-free at 0"), Name), int32(Pcm[0]), 0);
        TestEqual(FString::Printf(TEXT("Procedural PCM for %s ends click-free at 0"), Name), int32(Pcm.Last()), 0);
    }
    return true;
}
#endif
