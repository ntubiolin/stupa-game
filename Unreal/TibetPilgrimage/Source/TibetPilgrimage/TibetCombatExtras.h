#pragma once

#include "CoreMinimal.h"

class AActor;
class APawn;
class ATibetGameMode;

enum class ETibetSfx : uint8
{
    CastBolt = 0,
    CastMantra,
    CastHeavy,
    EnemyHit,
    EnemyPurify,
    BowShot,
    LootPickup,
    Count
};

enum class ETibetLootKind : uint8
{
    ManiPearl = 0,
    AmritaPill,
    ProtectorRelic
};

struct FTibetMonsterAnimState
{
    FVector2D LastPos2D = FVector2D::ZeroVector;
    FVector BaseScale = FVector::OneVector;
    double FallbackZ = 0.0;
    float WalkPhase = 0.f;
    float StrideAmp = 0.f;
    float GaitMode = 0.f; // 0 = biped, 1 = quadruped/mount, 2 = spectral/serpentine
    float HitFlash = 0.f;
    float HitSquash = 0.f;
    bool bInitialized = false;
};

struct FTibetArrowProjectile
{
    TWeakObjectPtr<AActor> Actor;
    FVector Position = FVector::ZeroVector;
    FVector Velocity = FVector::ZeroVector;
    float Age = 0.f;
    float TrailAccum = 0.f;
};

struct FTibetLootDrop
{
    TWeakObjectPtr<AActor> Actor;
    FVector Position = FVector::ZeroVector;
    double BaseZ = 48.0;
    float Age = 0.f;
    ETibetLootKind Kind = ETibetLootKind::ManiPearl;
};

struct TIBETPILGRIMAGE_API FTibetCombatState
{
    TMap<TWeakObjectPtr<AActor>, FTibetMonsterAnimState> MonsterAnims;
    TArray<FTibetArrowProjectile> Arrows;
    TArray<FTibetLootDrop> LootDrops;
    int32 LootCounter = 0;

    void ClearActors(bool bClearLoot = true);
    void PruneStaleMonsters();
};

struct TIBETPILGRIMAGE_API FTibetCombatExtras
{
    static constexpr float RangedAttackRadius = 920.f;
    static constexpr float RangedPreferredMin = 420.f;
    static constexpr float RangedPreferredMax = 780.f;
    static constexpr float RangedStandoffStop = 580.f;
    static constexpr float ArrowSpeed = 1180.f;
    static constexpr float ArrowDamage = 9.f;
    static constexpr float ArrowMaxLifetime = 1.35f;
    static constexpr float LootPickupRadius = 240.f;
    static constexpr float LootMagnetDelay = 2.8f;
    static constexpr float LootMagnetSpeed = 950.f;

    // Issue #6: Monster gait classification & stride kinematics + CustomPrimitiveData[0..3]
    static float ClassifyGaitMode(const FString& ModelName);
    static float ClassifyActorGaitMode(const AActor* Actor);
    static void RecordMonsterHit(FTibetCombatState& State, AActor& Monster, const FVector& FromPlayer, bool bAllowKnockback);
    static void UpdateMonsterKinematics(ATibetGameMode& Mode, FTibetCombatState& State, AActor& Monster,
        float HitRecoilRoll, float Dt);

    // Issue #7: Combat / Loot SFX & Hit / Purification VFX
    static const TCHAR* SfxAssetName(ETibetSfx Cue);
    static ETibetSfx SkillCastSfx(int32 SkillSlot);
    static const TArray<int16>& GetOrBuildProceduralPcm(ETibetSfx Cue);
    static void PlaySfx(const UObject* WorldContext, ETibetSfx Cue, float Volume = 0.78f, float Pitch = 1.0f);
    static void SpawnHitAndPurifyVfx(ATibetGameMode& Mode, const FVector& HitPos, const FVector& MonsterBasePos,
        int32 SkillSlot, bool bDefeated);

    // Issue #8: TsenRider mounted ranged bow attack & 3D spirit arrow projectile
    static bool IsRangedArcher(const AActor* Actor);
    static AActor* SpawnArrowProjectile(ATibetGameMode& Mode, FTibetCombatState& State,
        const FVector& StartPos, const FVector& AimTarget);
    static void TickArrows(ATibetGameMode& Mode, FTibetCombatState& State, APawn* Player, float Dt);

    // Issue #9: Diverse chapter / wilderness spawn coordinates & 3D treasure loot drops
    static int32 WildernessCampCount();
    static FVector WildernessCamp(int32 Index);
    static bool TryGetChapterCombatAnchor(const FString& MapName, int32 Step, int32 Count, bool bBoss, FVector& OutAnchor);
    static AActor* SpawnLootDrop(ATibetGameMode& Mode, FTibetCombatState& State, const FVector& DefeatedPos, bool bBoss);
    static void TickLootDrops(ATibetGameMode& Mode, FTibetCombatState& State, APawn* Player, float Dt);
    static void CollectLootDrop(ATibetGameMode& Mode, ETibetLootKind Kind, const FVector& DropPos);
};
