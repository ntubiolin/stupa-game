#include "TibetCombatExtras.h"
#include "TibetBossHalo.h"
#include "TibetGameMode.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/App.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Sound/SoundWave.h"
#include "Sound/SoundWaveProcedural.h"
#include "UObject/Package.h"

namespace
{
constexpr int32 ProceduralSampleRate = 32000;
const TCHAR* BasicSphere = TEXT("/Engine/BasicShapes/Sphere.Sphere");
const TCHAR* BasicCylinder = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
const TCHAR* BasicCone = TEXT("/Engine/BasicShapes/Cone.Cone");

const FVector NorthernWildernessCamps[] = {
    {-1050, -340, 0},
    {-680, 420, 0},
    {-280, -480, 0},
    {140, 390, 0},
    {480, -440, 0},
    {820, 340, 0},
    {-460, 120, 0},
    {640, -120, 0},
    {1120, -360, 0},
    {980, 120, 0}
};

const FVector PharpingSpringSprites[] = {
    {920, -560, 0},
    {1180, -480, 0},
    {460, -780, 0},
    {120, -620, 0},
    {1180, 580, 0},
    {760, 580, 0}
};

const FVector YarlungYakMeadows[] = {
    {-820, -520, 0},
    {-420, 480, 0},
    {120, -560, 0},
    {540, 460, 0},
    {960, -480, 0},
    {1180, 120, 0},
    {-580, 180, 0},
    {760, -160, 0},
    {1620, -460, 0},
    {420, -180, 0},
    {-220, -240, 0},
    {260, 180, 0},
    {-760, 520, 0},
    {1340, -240, 0},
    {1780, -120, 0}
};

const FVector SamyeNightPerimeter[] = {
    {1380, -1180, 0},
    {1380, 1180, 0},
    {1120, 0, 0}
};

const FVector SamyeHepoRiWaves[] = {
    {2250, 3150, 0},
    {2850, 3350, 0},
    {3450, 3250, 0},
    {3950, 3050, 0}
};

const FVector Terma1Sentinels[] = {
    {-920, -260, 0},
    {-120, 410, 0},
    {620, -290, 0}
};

const FVector Terma2CrystalSpirits[] = {
    {-720, 340, 0},
    {-80, -390, 0},
    {580, 320, 0}
};

UStaticMeshComponent* AddGlowingPart(AActor* Owner, USceneComponent* Parent, const TCHAR* MeshPath,
    const FVector& RelLocation, const FRotator& RelRotation, const FVector& RelScale,
    UMaterialInterface* RitualMaterial, const FLinearColor& Color)
{
    UStaticMesh* Mesh = LoadObject<UStaticMesh>(nullptr, MeshPath);
    if (!Owner || !Mesh) return nullptr;
    auto* Comp = NewObject<UStaticMeshComponent>(Owner);
    Comp->SetMobility(EComponentMobility::Movable);
    Comp->SetStaticMesh(Mesh);
    Comp->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Comp->SetGenerateOverlapEvents(false);
    Comp->SetCastShadow(false);
    Comp->SetCanEverAffectNavigation(false);
    if (Parent)
    {
        Comp->SetupAttachment(Parent);
        Comp->SetRelativeLocationAndRotation(RelLocation, RelRotation);
        Comp->SetRelativeScale3D(RelScale);
    }
    else
    {
        Owner->SetRootComponent(Comp);
        Comp->SetWorldScale3D(RelScale);
    }
    if (RitualMaterial)
    {
        if (auto* Mid = Comp->CreateDynamicMaterialInstance(0, RitualMaterial))
            Mid->SetVectorParameterValue(TEXT("Color"), Color);
    }
    else if (UMaterialInterface* DefaultMat = UMaterial::GetDefaultMaterial(MD_Surface))
    {
        Comp->SetMaterial(0, DefaultMat);
    }
    Comp->RegisterComponent();
    return Comp;
}

void FinalizePcmEnvelope(const TArray<double>& FloatSamples, TArray<int16>& OutPcm)
{
    const int32 Num = FloatSamples.Num();
    OutPcm.SetNumUninitialized(Num);
    const int32 FadeIn = FMath::Min(int32(0.0025 * ProceduralSampleRate), FMath::Max(1, Num / 8));
    const int32 FadeOut = FMath::Min(int32(0.015 * ProceduralSampleRate), FMath::Max(1, Num / 4));
    for (int32 I = 0; I < Num; ++I)
    {
        double Env = 1.0;
        if (I < FadeIn) Env = double(I) / FadeIn;
        else if (I >= Num - FadeOut) Env = double(Num - 1 - I) / FadeOut;
        const double Shaped = FMath::Clamp(FMath::Tanh(FloatSamples[I] * Env * 1.12), -0.98, 0.98);
        OutPcm[I] = int16(FMath::RoundToInt(Shaped * 32767.0));
    }
}

void BuildSmoothedNoise(int32 Num, uint32 Seed, TArray<double>& OutNoise)
{
    OutNoise.SetNumUninitialized(Num);
    uint32 State = Seed;
    double Prev = 0.0;
    for (int32 I = 0; I < Num; ++I)
    {
        State = 1664525u * State + 1013904223u;
        const double Raw = (double(State >> 8) / 8388607.5) - 1.0;
        Prev = Prev * 0.62 + Raw * 0.38;
        OutNoise[I] = Prev;
    }
}

void SynthesizeCue(ETibetSfx Cue, TArray<int16>& OutPcm)
{
    TArray<double> Buf, Noise;
    switch (Cue)
    {
    case ETibetSfx::CastBolt:
    {
        const int32 N = int32(0.34 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        BuildSmoothedNoise(N, 0x108A11u, Noise);
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            const double Chime = 0.44 * FMath::Sin(UE_TWO_PI * 880.0 * T) * FMath::Exp(-T * 11.5)
                + 0.28 * FMath::Sin(UE_TWO_PI * 1318.5 * T) * FMath::Exp(-T * 14.0)
                + 0.19 * FMath::Sin(UE_TWO_PI * 2112.0 * T) * FMath::Exp(-T * 18.5)
                + 0.12 * FMath::Sin(UE_TWO_PI * 2860.0 * T) * FMath::Exp(-T * 24.0);
            const double Sweep = FMath::Sin(UE_TWO_PI * (420.0 + 960.0 * (1.0 - FMath::Exp(-T * 9.0))) * T);
            const double WhooshSin = FMath::Max(0.0, FMath::Sin(UE_PI * FMath::Min(1.0, T / 0.26)));
            const double WhooshEnv = FMath::Pow(WhooshSin, 1.4) * FMath::Exp(-T * 4.5);
            Buf[I] = Chime + (0.24 * Noise[I] + 0.14 * Sweep) * WhooshEnv;
        }
        break;
    }
    case ETibetSfx::CastMantra:
    {
        const int32 N = int32(0.64 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            const double Attack = 1.0 - FMath::Exp(-T * 85.0);
            const double Beat = 1.0 + 0.14 * FMath::Sin(UE_TWO_PI * 5.2 * T);
            const double Bowl = 0.36 * FMath::Sin(UE_TWO_PI * 293.66 * T) * FMath::Exp(-T * 3.2)
                + 0.30 * FMath::Sin(UE_TWO_PI * 440.00 * T) * FMath::Exp(-T * 3.8)
                + 0.24 * FMath::Sin(UE_TWO_PI * 587.33 * T + 0.4) * FMath::Exp(-T * 4.5)
                + 0.16 * FMath::Sin(UE_TWO_PI * 880.00 * T) * FMath::Exp(-T * 5.8)
                + 0.10 * FMath::Sin(UE_TWO_PI * 1318.5 * T) * FMath::Exp(-T * 8.5);
            Buf[I] = Attack * Beat * Bowl;
        }
        break;
    }
    case ETibetSfx::CastHeavy:
    {
        const int32 N = int32(0.70 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        BuildSmoothedNoise(N, 0x5A3E77u, Noise);
        double PhaseSub = 0.0;
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            PhaseSub += UE_TWO_PI * (48.0 + 96.0 * FMath::Exp(-T * 22.0)) / ProceduralSampleRate;
            const double Sub = 0.52 * FMath::Sin(PhaseSub) * FMath::Exp(-T * 7.5);
            const double Bell = 0.34 * FMath::Sin(UE_TWO_PI * 523.25 * T) * FMath::Exp(-T * 4.6)
                + 0.25 * FMath::Sin(UE_TWO_PI * 783.99 * T) * FMath::Exp(-T * 5.8)
                + 0.20 * FMath::Sin(UE_TWO_PI * 1418.0 * T) * FMath::Exp(-T * 8.2)
                + 0.14 * FMath::Sin(UE_TWO_PI * 2245.0 * T) * FMath::Exp(-T * 12.5);
            Buf[I] = Sub + Bell + 0.26 * Noise[I] * FMath::Exp(-T * 34.0);
        }
        break;
    }
    case ETibetSfx::EnemyHit:
    {
        const int32 N = int32(0.28 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        BuildSmoothedNoise(N, 0x99C0DEu, Noise);
        double Phase = 0.0;
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            Phase += UE_TWO_PI * (52.0 + 135.0 * FMath::Exp(-T * 38.0)) / ProceduralSampleRate;
            const double Thud = 0.66 * FMath::Sin(Phase) * FMath::Exp(-T * 14.5);
            const double Spark = 0.28 * FMath::Sin(UE_TWO_PI * 1680.0 * T) * FMath::Exp(-T * 22.0)
                + 0.20 * FMath::Sin(UE_TWO_PI * 2540.0 * T) * FMath::Exp(-T * 28.0);
            Buf[I] = Thud + Spark + 0.36 * Noise[I] * FMath::Exp(-T * 36.0);
        }
        break;
    }
    case ETibetSfx::EnemyPurify:
    {
        const int32 N = int32(0.76 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        struct FNote { double Onset, Freq, Amp; };
        static const FNote Notes[] = {
            {0.00, 587.33, 0.34}, {0.08, 739.99, 0.30}, {0.16, 880.00, 0.32},
            {0.25, 1174.66, 0.34}, {0.35, 1760.00, 0.28}
        };
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            double Val = 0.18 * FMath::Sin(UE_TWO_PI * 293.66 * T) * FMath::Exp(-T * 3.4);
            for (const FNote& Note : Notes)
            {
                if (T < Note.Onset) continue;
                const double Dt = T - Note.Onset;
                Val += (1.0 - FMath::Exp(-Dt * 120.0)) * Note.Amp * (
                    FMath::Sin(UE_TWO_PI * Note.Freq * Dt) * FMath::Exp(-Dt * 5.2)
                    + 0.35 * FMath::Sin(UE_TWO_PI * Note.Freq * 2.0 * Dt) * FMath::Exp(-Dt * 8.5));
            }
            Buf[I] = Val;
        }
        break;
    }
    case ETibetSfx::BowShot:
    {
        const int32 N = int32(0.36 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        BuildSmoothedNoise(N, 0xB07754u, Noise);
        double Phase = 0.0;
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            Phase += UE_TWO_PI * (162.0 + 46.0 * FMath::Exp(-T * 18.0)) / ProceduralSampleRate;
            const double Twang = 0.46 * FMath::Sin(Phase) * FMath::Exp(-T * 10.5)
                + 0.26 * FMath::Sin(2.0 * Phase) * FMath::Exp(-T * 15.0)
                + 0.16 * FMath::Sin(3.0 * Phase) * FMath::Exp(-T * 21.0);
            const double Wt = FMath::Max(0.0, T - 0.015);
            const double WSin = FMath::Max(0.0, FMath::Sin(UE_PI * FMath::Min(1.0, Wt / 0.28)));
            const double WEnv = FMath::Pow(WSin, 1.3) * FMath::Exp(-Wt * 5.5);
            Buf[I] = Twang + (0.42 * Noise[I] + 0.15 * FMath::Sin(UE_TWO_PI * (980.0 - 460.0 * Wt) * Wt)) * WEnv;
        }
        break;
    }
    default:
    {
        const int32 N = int32(0.46 * ProceduralSampleRate);
        Buf.SetNumZeroed(N);
        struct FNote { double Onset, Freq, Amp; };
        static const FNote Chimes[] = {
            {0.00, 880.00, 0.38}, {0.07, 1174.66, 0.36}, {0.14, 1479.98, 0.34}, {0.21, 1760.00, 0.38}
        };
        for (int32 I = 0; I < N; ++I)
        {
            const double T = double(I) / ProceduralSampleRate;
            double Val = 0.0;
            for (const FNote& Note : Chimes)
            {
                if (T < Note.Onset) continue;
                const double Dt = T - Note.Onset;
                Val += (1.0 - FMath::Exp(-Dt * 150.0)) * Note.Amp * (
                    FMath::Sin(UE_TWO_PI * Note.Freq * Dt) * FMath::Exp(-Dt * 7.8)
                    + 0.30 * FMath::Sin(UE_TWO_PI * Note.Freq * 2.0 * Dt) * FMath::Exp(-Dt * 13.0));
            }
            Buf[I] = Val;
        }
        break;
    }
    }
    FinalizePcmEnvelope(Buf, OutPcm);
}
} // namespace

void FTibetCombatState::ClearActors(bool bClearLoot)
{
    for (FTibetArrowProjectile& Arrow : Arrows)
        if (AActor* A = Arrow.Actor.Get()) A->Destroy();
    Arrows.Reset();

    if (bClearLoot)
    {
        for (FTibetLootDrop& Drop : LootDrops)
            if (AActor* A = Drop.Actor.Get()) A->Destroy();
        LootDrops.Reset();
    }
    MonsterAnims.Reset();
}

void FTibetCombatState::PruneStaleMonsters()
{
    for (auto It = MonsterAnims.CreateIterator(); It; ++It)
    {
        if (!It.Key().IsValid()) It.RemoveCurrent();
    }
}

float FTibetCombatExtras::ClassifyGaitMode(const FString& ModelName)
{
    if (ModelName.Contains(TEXT("RiverYak"), ESearchCase::IgnoreCase) ||
        ModelName.Contains(TEXT("TsenRider"), ESearchCase::IgnoreCase) ||
        ModelName.Contains(TEXT("Pehar"), ESearchCase::IgnoreCase))
    {
        return 1.f; // Quadruped / mounted 4-leg diagonal stride
    }
    if (ModelName.Contains(TEXT("Preta"), ESearchCase::IgnoreCase) ||
        ModelName.Contains(TEXT("DroughtSpirit"), ESearchCase::IgnoreCase))
    {
        return 2.f; // Spectral / serpentine Naga coil wave
    }
    return 0.f; // Biped stride (SnowMigoi, SnowKing, Guardian, Tenma)
}

float FTibetCombatExtras::ClassifyActorGaitMode(const AActor* Actor)
{
    if (!Actor) return 0.f;
    if (Actor->ActorHasTag(TEXT("tsen"))) return 1.f;
    if (Actor->ActorHasTag(TEXT("preta"))) return 2.f;
    if (Actor->ActorHasTag(TEXT("migoi"))) return 0.f;
    if (const auto* MeshComp = Actor->FindComponentByClass<UStaticMeshComponent>())
        if (const UStaticMesh* Mesh = MeshComp->GetStaticMesh())
            return ClassifyGaitMode(Mesh->GetName());
    return 0.f;
}

void FTibetCombatExtras::RecordMonsterHit(FTibetCombatState& State, AActor& Monster,
    const FVector& FromPlayer, bool bAllowKnockback)
{
    FTibetMonsterAnimState& Anim = State.MonsterAnims.FindOrAdd(&Monster);
    if (!Anim.bInitialized)
    {
        const FVector Pos = Monster.GetActorLocation();
        Anim.LastPos2D = FVector2D(Pos.X, Pos.Y);
        Anim.FallbackZ = Pos.Z;
        Anim.BaseScale = Monster.GetActorScale3D();
        Anim.GaitMode = ClassifyActorGaitMode(&Monster);
        Anim.bInitialized = true;
    }
    Anim.HitFlash = 1.0f;
    Anim.HitSquash = 1.0f;

    if (bAllowKnockback)
    {
        const FVector KnockDir = (Monster.GetActorLocation() - FromPlayer).GetSafeNormal2D();
        if (!KnockDir.IsNearlyZero())
        {
            Monster.AddActorWorldOffset(KnockDir * 22.f, true);
            const FVector NewPos = Monster.GetActorLocation();
            Anim.LastPos2D = FVector2D(NewPos.X, NewPos.Y);
        }
    }

    if (auto* MeshComp = Monster.FindComponentByClass<UStaticMeshComponent>())
    {
        MeshComp->SetCustomPrimitiveDataFloat(2, Anim.GaitMode);
        MeshComp->SetCustomPrimitiveDataFloat(3, Anim.HitFlash);
    }
}

void FTibetCombatExtras::UpdateMonsterKinematics(ATibetGameMode& Mode, FTibetCombatState& State,
    AActor& Monster, float HitRecoilRoll, float Dt)
{
    FTibetMonsterAnimState& Anim = State.MonsterAnims.FindOrAdd(&Monster);
    const FVector CurPos = Monster.GetActorLocation();
    const FVector2D Cur2D(CurPos.X, CurPos.Y);
    if (!Anim.bInitialized)
    {
        Anim.LastPos2D = Cur2D;
        Anim.FallbackZ = CurPos.Z;
        Anim.BaseScale = Monster.GetActorScale3D();
        Anim.GaitMode = ClassifyActorGaitMode(&Monster);
        Anim.bInitialized = true;
    }

    float MovedDist = float(FVector2D::Distance(Cur2D, Anim.LastPos2D));
    if (MovedDist > 260.f) MovedDist = 0.f; // Ignore discrete spawn/teleport jumps
    Anim.LastPos2D = Cur2D;

    if (Dt > KINDA_SMALL_NUMBER)
    {
        Anim.WalkPhase = FMath::Fmod(Anim.WalkPhase + MovedDist * 0.055f, float(UE_TWO_PI * 64.0));
        const float Speed = MovedDist / Dt;
        const float TargetAmp = FMath::Clamp(Speed / 110.f, 0.f, 1.f);
        Anim.StrideAmp = FMath::FInterpTo(Anim.StrideAmp, TargetAmp, Dt, MovedDist > 0.05f ? 14.f : 9.f);
        if (Anim.StrideAmp < 0.002f && TargetAmp == 0.f) Anim.StrideAmp = 0.f;
        Anim.HitFlash = FMath::Max(0.f, Anim.HitFlash - Dt / 0.24f);
        Anim.HitSquash = FMath::Max(0.f, Anim.HitSquash - Dt / 0.22f);
    }

    const double GroundZ = Mode.GroundHeight(FVector(CurPos.X, CurPos.Y, Anim.FallbackZ));
    Anim.FallbackZ = GroundZ;
    const double StrideBounce = FMath::Abs(FMath::Sin(Anim.WalkPhase)) * 7.5 * Anim.StrideAmp;

    FRotator Pose = Monster.GetActorRotation();
    // Monster local -Y points forward toward player; Roll tilts fore/aft (gallop + recoil) and Pitch sways laterally.
    Pose.Roll = HitRecoilRoll + FMath::Sin(Anim.WalkPhase * 2.f) * 4.5f * Anim.StrideAmp;
    Pose.Pitch = FMath::Sin(Anim.WalkPhase) * 5.5f * Anim.StrideAmp;
    Monster.SetActorLocationAndRotation(FVector(CurPos.X, CurPos.Y, GroundZ + StrideBounce), Pose);

    const float Punch = FMath::Sin(Anim.HitSquash * UE_PI * 0.5f);
    Monster.SetActorScale3D(Anim.BaseScale * FMath::Lerp(FVector::OneVector, FVector(1.12f, 1.12f, 0.90f), Punch));

    // Keep any attached Boss foot halo flush on the ground at GroundZ + 6 cm.
    TArray<AActor*> Attached;
    Monster.GetAttachedActors(Attached);
    for (AActor* Child : Attached)
    {
        if (Cast<ATibetBossHalo>(Child))
            Child->SetActorLocation(FVector(CurPos.X, CurPos.Y, GroundZ + 6.0));
    }

    if (auto* MeshComp = Monster.FindComponentByClass<UStaticMeshComponent>())
    {
        MeshComp->SetCustomPrimitiveDataFloat(0, Anim.WalkPhase);
        MeshComp->SetCustomPrimitiveDataFloat(1, Anim.StrideAmp);
        MeshComp->SetCustomPrimitiveDataFloat(2, Anim.GaitMode);
        MeshComp->SetCustomPrimitiveDataFloat(3, Anim.HitFlash);
    }
}

const TCHAR* FTibetCombatExtras::SfxAssetName(ETibetSfx Cue)
{
    switch (Cue)
    {
    case ETibetSfx::CastBolt: return TEXT("sfx_cast_bolt");
    case ETibetSfx::CastMantra: return TEXT("sfx_cast_mantra");
    case ETibetSfx::CastHeavy: return TEXT("sfx_cast_heavy");
    case ETibetSfx::EnemyHit: return TEXT("sfx_enemy_hit");
    case ETibetSfx::EnemyPurify: return TEXT("sfx_enemy_purify");
    case ETibetSfx::BowShot: return TEXT("sfx_bow_shot");
    case ETibetSfx::LootPickup: return TEXT("sfx_loot_pickup");
    default: return TEXT("sfx_enemy_hit");
    }
}

ETibetSfx FTibetCombatExtras::SkillCastSfx(int32 SkillSlot)
{
    if (SkillSlot == 0) return ETibetSfx::CastBolt;
    if (SkillSlot == 1 || SkillSlot == 4) return ETibetSfx::CastMantra;
    return ETibetSfx::CastHeavy;
}

const TArray<int16>& FTibetCombatExtras::GetOrBuildProceduralPcm(ETibetSfx Cue)
{
    static TArray<int16> Cache[int32(ETibetSfx::Count)];
    const int32 Idx = FMath::Clamp(int32(Cue), 0, int32(ETibetSfx::Count) - 1);
    if (Cache[Idx].IsEmpty())
        SynthesizeCue(ETibetSfx(Idx), Cache[Idx]);
    return Cache[Idx];
}

void FTibetCombatExtras::PlaySfx(const UObject* WorldContext, ETibetSfx Cue, float Volume, float Pitch)
{
    if (!WorldContext || !WorldContext->GetWorld()) return;
    if (FParse::Param(FCommandLine::Get(), TEXT("nosound")) ||
        (FApp::IsUnattended() && !FParse::Param(FCommandLine::Get(), TEXT("TibetQAVoice")) &&
         !FParse::Param(FCommandLine::Get(), TEXT("TibetQAAudio"))))
    {
        return;
    }

    const TCHAR* Name = SfxAssetName(Cue);
    const FString AssetPath = FString::Printf(TEXT("/Game/SFX/%s.%s"), Name, Name);
    if (USoundWave* CookedWave = LoadObject<USoundWave>(nullptr, *AssetPath))
    {
        UGameplayStatics::PlaySound2D(WorldContext, CookedWave, Volume, Pitch);
        return;
    }

    const TArray<int16>& Samples = GetOrBuildProceduralPcm(Cue);
    if (Samples.IsEmpty()) return;
    auto* Proc = NewObject<USoundWaveProcedural>(GetTransientPackage());
    if (!Proc) return;
    Proc->SetSampleRate(ProceduralSampleRate);
    Proc->NumChannels = 1;
    Proc->Duration = float(Samples.Num()) / float(ProceduralSampleRate);
    Proc->SoundGroup = SOUNDGROUP_Effects;
    Proc->bLooping = false;
    Proc->QueueAudio(reinterpret_cast<const uint8*>(Samples.GetData()), Samples.Num() * sizeof(int16));
    UGameplayStatics::PlaySound2D(WorldContext, Proc, Volume, Pitch);
}

void FTibetCombatExtras::SpawnHitAndPurifyVfx(ATibetGameMode& Mode, const FVector& HitPos,
    const FVector& MonsterBasePos, int32 SkillSlot, bool bDefeated)
{
    static const FLinearColor SlotSparks[] = {
        {0.35f, 1.45f, 1.65f, 0.92f}, // 0 Hum Bolt turquoise-gold
        {1.65f, 1.12f, 0.28f, 0.92f}, // 1 Six-Syllable saffron-gold
        {1.75f, 0.42f, 0.14f, 0.94f}, // 2 Phurba wisdom fire
        {1.65f, 1.24f, 0.45f, 0.92f}, // 3 Ghanta bronze-gold
        {1.55f, 0.65f, 0.85f, 0.90f}, // 4 Lotus
        {0.45f, 1.50f, 1.45f, 0.94f}, // 5 Tenma glacial turquoise
        {1.85f, 1.32f, 0.35f, 0.96f}, // 6 Vajra Guru pure gold
    };
    const FLinearColor SparkColor = SlotSparks[FMath::Clamp(SkillSlot, 0, int32(UE_ARRAY_COUNT(SlotSparks)) - 1)];
    Mode.Pulse(HitPos, SparkColor, 0.68f);

    if (!bDefeated || !Mode.GetWorld()) return;

    // Golden upward Tibetan purification crown burst on liberation (0 PointLights!)
    const FLinearColor PureGold(1.95f, 1.38f, 0.30f, 0.95f);
    const FLinearColor PureJade(0.28f, 1.52f, 1.28f, 0.90f);
    Mode.Pulse(MonsterBasePos + FVector(0, 0, 72), PureGold, 1.18f);
    for (int32 I = 0; I < 10; ++I)
    {
        const double A = UE_TWO_PI * I / 10.0;
        const FVector RayPos = MonsterBasePos + FVector(FMath::Cos(A) * 56.0, FMath::Sin(A) * 56.0, 58.0 + 18.0 * (I % 3));
        if (AActor* Pillar = Mode.GetWorld()->SpawnActor<AActor>(RayPos, FRotator::ZeroRotator))
        {
            AddGlowingPart(Pillar, nullptr, BasicCylinder, FVector::ZeroVector, FRotator::ZeroRotator,
                FVector(0.065f, 0.065f, 0.68f + 0.18f * (I % 2)), Mode.RitualMaterial,
                (I % 2 == 0) ? PureGold : PureJade);
            Pillar->SetLifeSpan(0.52f);
        }
    }
}

bool FTibetCombatExtras::IsRangedArcher(const AActor* Actor)
{
    if (!Actor) return false;
    if (Actor->ActorHasTag(TEXT("tsen")) || Actor->ActorHasTag(TEXT("TibetRangedArcher")))
        return true;
    if (const auto* MeshComp = Actor->FindComponentByClass<UStaticMeshComponent>())
        if (const UStaticMesh* Mesh = MeshComp->GetStaticMesh())
            return Mesh->GetName().Contains(TEXT("TsenRider"), ESearchCase::IgnoreCase);
    return false;
}

AActor* FTibetCombatExtras::SpawnArrowProjectile(ATibetGameMode& Mode, FTibetCombatState& State,
    const FVector& StartPos, const FVector& AimTarget)
{
    UWorld* World = Mode.GetWorld();
    if (!World) return nullptr;
    FVector Dir = (AimTarget - StartPos).GetSafeNormal();
    if (Dir.IsNearlyZero()) Dir = FVector::ForwardVector;

    AActor* ArrowActor = World->SpawnActor<AActor>(StartPos, Dir.Rotation());
    if (!ArrowActor) return nullptr;
    auto* Root = NewObject<USceneComponent>(ArrowActor);
    Root->SetMobility(EComponentMobility::Movable);
    ArrowActor->SetRootComponent(Root);
    Root->RegisterComponent();
    ArrowActor->SetActorLocationAndRotation(StartPos, Dir.Rotation());

    const FLinearColor CrimsonShaft(1.85f, 0.16f, 0.08f, 0.96f);
    const FLinearColor GiltTip(2.05f, 1.38f, 0.28f, 0.98f);
    const FLinearColor FeatherRed(1.72f, 0.30f, 0.12f, 0.92f);

    // Glowing crimson shaft + golden barbed arrowhead + crossed crimson fletching (0 PointLights)
    AddGlowingPart(ArrowActor, Root, BasicCylinder, FVector(-6.f, 0.f, 0.f), FRotator(90.f, 0.f, 0.f),
        FVector(0.036f, 0.036f, 0.92f), Mode.RitualMaterial, CrimsonShaft);
    AddGlowingPart(ArrowActor, Root, BasicCone, FVector(46.f, 0.f, 0.f), FRotator(-90.f, 0.f, 0.f),
        FVector(0.13f, 0.13f, 0.26f), Mode.RitualMaterial, GiltTip);
    AddGlowingPart(ArrowActor, Root, BasicSphere, FVector(-44.f, 0.f, 0.f), FRotator::ZeroRotator,
        FVector(0.22f, 0.16f, 0.04f), Mode.RitualMaterial, FeatherRed);
    AddGlowingPart(ArrowActor, Root, BasicSphere, FVector(-44.f, 0.f, 0.f), FRotator::ZeroRotator,
        FVector(0.22f, 0.04f, 0.16f), Mode.RitualMaterial, FeatherRed);

    FTibetArrowProjectile Proj;
    Proj.Actor = ArrowActor;
    Proj.Position = StartPos;
    Proj.Velocity = Dir * ArrowSpeed;
    State.Arrows.Add(Proj);
    return ArrowActor;
}

void FTibetCombatExtras::TickArrows(ATibetGameMode& Mode, FTibetCombatState& State, APawn* Player, float Dt)
{
    UWorld* World = Mode.GetWorld();
    if (!World || State.Arrows.IsEmpty()) return;
    const float Now = World->GetTimeSeconds();

    for (int32 I = State.Arrows.Num() - 1; I >= 0; --I)
    {
        FTibetArrowProjectile& Arrow = State.Arrows[I];
        AActor* Actor = Arrow.Actor.Get();
        if (!Actor)
        {
            State.Arrows.RemoveAt(I);
            continue;
        }

        const FVector PrevPos = Arrow.Position;
        Arrow.Age += Dt;
        Arrow.TrailAccum += Dt;
        Arrow.Position += Arrow.Velocity * Dt;
        Actor->SetActorLocationAndRotation(Arrow.Position, Arrow.Velocity.Rotation());

        if (Arrow.TrailAccum >= 0.05f)
        {
            Arrow.TrailAccum = 0.f;
            if (AActor* Bead = World->SpawnActor<AActor>(PrevPos, FRotator::ZeroRotator))
            {
                AddGlowingPart(Bead, nullptr, BasicSphere, FVector::ZeroVector, FRotator::ZeroRotator,
                    FVector(0.065f), Mode.RitualMaterial, FLinearColor(1.85f, 0.42f, 0.12f, 0.85f));
                Bead->SetLifeSpan(0.16f);
            }
        }

        // Check world static obstacle hit
        FHitResult BlockHit;
        const FCollisionObjectQueryParams WorldStatic(ECC_WorldStatic);
        FCollisionQueryParams TraceParams(SCENE_QUERY_STAT(TibetArrowTrace), false, Actor);
        if (Mode.Focus) TraceParams.AddIgnoredActor(Mode.Focus);
        if (World->LineTraceSingleByObjectType(BlockHit, PrevPos, Arrow.Position, WorldStatic, TraceParams))
        {
            Mode.Pulse(BlockHit.ImpactPoint, FLinearColor(1.75f, 0.35f, 0.10f), 0.38f);
            Actor->Destroy();
            State.Arrows.RemoveAt(I);
            continue;
        }

        // Check Pilgrim hit along swept segment so arrows never tunnel across frames
        if (IsValid(Player))
        {
            const FVector PlayerLoc = Player->GetActorLocation();
            const FVector Closest = FMath::ClosestPointOnSegment(PlayerLoc, PrevPos, Arrow.Position);
            if (FVector::Dist2D(Closest, PlayerLoc) <= 88.0 && FMath::Abs(Closest.Z - PlayerLoc.Z) <= 110.0)
            {
                Mode.Pulse(Closest, FLinearColor(1.85f, 0.32f, 0.10f), 0.52f);
                PlaySfx(&Mode, ETibetSfx::EnemyHit, 0.65f, 0.92f);
                Actor->Destroy();
                State.Arrows.RemoveAt(I);
                if (Mode.Shield <= 0.f)
                {
                    const float Before = Mode.Health;
                    Mode.Health = FMath::Max(0.f, Mode.Health - ArrowDamage);
                    Mode.PlayerFeedback.RecordHit(Now, Before, Mode.Health);
                    if (Mode.Health <= 0.f)
                    {
                        Mode.RespawnPlayer(*Player);
                        return;
                    }
                }
                continue;
            }
        }

        if (Arrow.Age >= ArrowMaxLifetime)
        {
            Actor->Destroy();
            State.Arrows.RemoveAt(I);
        }
    }
}

int32 FTibetCombatExtras::WildernessCampCount()
{
    return UE_ARRAY_COUNT(NorthernWildernessCamps);
}

FVector FTibetCombatExtras::WildernessCamp(int32 Index)
{
    const int32 Wrapped = ((Index % UE_ARRAY_COUNT(NorthernWildernessCamps)) + UE_ARRAY_COUNT(NorthernWildernessCamps))
        % UE_ARRAY_COUNT(NorthernWildernessCamps);
    return NorthernWildernessCamps[Wrapped];
}

bool FTibetCombatExtras::TryGetChapterCombatAnchor(const FString& MapName, int32 Step, int32 Count,
    bool bBoss, FVector& OutAnchor)
{
    const int32 SafeCount = FMath::Max(0, Count);
    if (MapName == TEXT("wild") && bBoss)
    {
        OutAnchor = FVector(2150, 0, 0);
        return true;
    }
    if (MapName == TEXT("pharping") && !bBoss && Step == 1)
    {
        OutAnchor = PharpingSpringSprites[SafeCount % UE_ARRAY_COUNT(PharpingSpringSprites)];
        return true;
    }
    if (MapName == TEXT("yarlung") && !bBoss && Step == 4)
    {
        OutAnchor = YarlungYakMeadows[SafeCount % UE_ARRAY_COUNT(YarlungYakMeadows)];
        return true;
    }
    if (MapName == TEXT("samye"))
    {
        if (!bBoss && Step == 2)
        {
            OutAnchor = SamyeNightPerimeter[SafeCount % UE_ARRAY_COUNT(SamyeNightPerimeter)];
            return true;
        }
        if (!bBoss && Step == 4)
        {
            OutAnchor = SamyeHepoRiWaves[SafeCount % UE_ARRAY_COUNT(SamyeHepoRiWaves)];
            return true;
        }
        if (bBoss && Step == 5)
        {
            OutAnchor = FVector(2350, 0, 0);
            return true;
        }
    }
    if (MapName == TEXT("terma1") && !bBoss && Step == 1)
    {
        OutAnchor = Terma1Sentinels[SafeCount % UE_ARRAY_COUNT(Terma1Sentinels)];
        return true;
    }
    if (MapName == TEXT("terma2") && !bBoss && Step == 1)
    {
        OutAnchor = Terma2CrystalSpirits[SafeCount % UE_ARRAY_COUNT(Terma2CrystalSpirits)];
        return true;
    }
    return false;
}

AActor* FTibetCombatExtras::SpawnLootDrop(ATibetGameMode& Mode, FTibetCombatState& State,
    const FVector& DefeatedPos, bool bBoss)
{
    UWorld* World = Mode.GetWorld();
    if (!World) return nullptr;

    ETibetLootKind Kind = ETibetLootKind::ProtectorRelic;
    if (!bBoss)
    {
        Kind = (State.LootCounter++ % 2 == 0) ? ETibetLootKind::AmritaPill : ETibetLootKind::ManiPearl;
    }

    const double GroundZ = Mode.GroundHeight(DefeatedPos);
    const FVector SpawnPos(DefeatedPos.X, DefeatedPos.Y, GroundZ + 48.0);
    AActor* DropActor = World->SpawnActor<AActor>(SpawnPos, FRotator::ZeroRotator);
    if (!DropActor) return nullptr;

    auto* Root = NewObject<USceneComponent>(DropActor);
    Root->SetMobility(EComponentMobility::Movable);
    DropActor->SetRootComponent(Root);
    Root->RegisterComponent();
    DropActor->SetActorLocation(SpawnPos);

    FLinearColor CoreColor, RingColor, FinialColor;
    const float ScaleMul = bBoss ? 1.38f : 1.0f;
    if (Kind == ETibetLootKind::ProtectorRelic)
    {
        CoreColor = FLinearColor(2.05f, 1.42f, 0.28f, 0.96f);   // Sovereign Dharma Gold
        RingColor = FLinearColor(0.28f, 1.55f, 1.35f, 0.90f);   // Himalayan Turquoise Halo
        FinialColor = FLinearColor(1.85f, 0.38f, 0.22f, 0.92f); // Coral Relic Crest
    }
    else if (Kind == ETibetLootKind::AmritaPill)
    {
        CoreColor = FLinearColor(0.18f, 1.52f, 0.78f, 0.94f);   // Sacred Amrita Jade
        RingColor = FLinearColor(1.75f, 1.25f, 0.30f, 0.88f);   // Gilt Mandala Rim
        FinialColor = FLinearColor(1.65f, 1.18f, 0.32f, 0.85f);
    }
    else
    {
        CoreColor = FLinearColor(1.78f, 0.56f, 0.20f, 0.94f);   // Coral-Saffron Mani Pearl
        RingColor = FLinearColor(0.30f, 1.45f, 1.38f, 0.90f);   // Turquoise Mantra Ring
        FinialColor = FLinearColor(1.85f, 1.35f, 0.36f, 0.88f);
    }

    // Glowing 3D treasure orb + tilted lotus halo + vajra finial (strictly 0 PointLights!)
    AddGlowingPart(DropActor, Root, BasicSphere, FVector::ZeroVector, FRotator::ZeroRotator,
        FVector(0.34f * ScaleMul), Mode.RitualMaterial, CoreColor);
    AddGlowingPart(DropActor, Root, BasicCylinder, FVector::ZeroVector, FRotator(0.f, 0.f, 24.f),
        FVector(0.58f * ScaleMul, 0.58f * ScaleMul, 0.032f), Mode.RitualMaterial, RingColor);
    AddGlowingPart(DropActor, Root, BasicCylinder, FVector::ZeroVector, FRotator::ZeroRotator,
        FVector(0.11f * ScaleMul, 0.11f * ScaleMul, 0.48f * ScaleMul), Mode.RitualMaterial, FinialColor);

    FTibetLootDrop Entry;
    Entry.Actor = DropActor;
    Entry.Position = SpawnPos;
    Entry.BaseZ = SpawnPos.Z;
    Entry.Kind = Kind;
    State.LootDrops.Add(Entry);
    return DropActor;
}

void FTibetCombatExtras::CollectLootDrop(ATibetGameMode& Mode, ETibetLootKind Kind, const FVector& DropPos)
{
    PlaySfx(&Mode, ETibetSfx::LootPickup, 0.82f, 1.0f);
    Mode.Pulse(DropPos, FLinearColor(1.85f, 1.32f, 0.28f, 0.95f), 0.75f);

    if (Kind == ETibetLootKind::ProtectorRelic)
    {
        Mode.Health = FMath::Min(Mode.MaxHealth(), Mode.Health + 45.f);
        Mode.RestoreMana(50.f);
        if (Mode.Save)
        {
            Mode.Save->PillCharges = FMath::Clamp(Mode.Pills() + 2, 0, 4);
            Mode.Store();
        }
        for (float& Cd : Mode.Cooldown) Cd = 0.f;
        Mode.SetNotice(Mode.Local(
            TEXT("Looted treasure: Dharma Protector Relic (+45 Life · +50 Mana · +2 Amrita)"),
            TEXT("拾獲寶物：護法加持寶珠 (+45 體力・+50 法力・甘露丸 +2)")));
    }
    else if (Kind == ETibetLootKind::AmritaPill)
    {
        Mode.Health = FMath::Min(Mode.MaxHealth(), Mode.Health + 12.f);
        if (Mode.Save)
        {
            Mode.Save->PillCharges = FMath::Clamp(Mode.Pills() + 1, 0, 4);
            Mode.Store();
        }
        Mode.SetNotice(Mode.Local(
            TEXT("Looted treasure: Amrita Pill (+1)"),
            TEXT("拾獲寶物：甘露丸 (+1)")));
    }
    else
    {
        Mode.Health = FMath::Min(Mode.MaxHealth(), Mode.Health + 10.f);
        Mode.RestoreMana(24.f);
        Mode.SetNotice(Mode.Local(
            TEXT("Looted treasure: Mantra Mani Pearl (+24 Mana)"),
            TEXT("拾獲寶物：真言摩尼寶珠 (+24 法力)")));
    }
}

void FTibetCombatExtras::TickLootDrops(ATibetGameMode& Mode, FTibetCombatState& State, APawn* Player, float Dt)
{
    if (State.LootDrops.IsEmpty()) return;
    for (int32 I = State.LootDrops.Num() - 1; I >= 0; --I)
    {
        FTibetLootDrop& Drop = State.LootDrops[I];
        AActor* Actor = Drop.Actor.Get();
        if (!Actor)
        {
            State.LootDrops.RemoveAt(I);
            continue;
        }

        Drop.Age += Dt;
        const FRotator Spin(0.f, FMath::Fmod(Drop.Age * 135.f, 360.f), 0.f);

        if (IsValid(Player))
        {
            const FVector TargetPos = Player->GetActorLocation() + FVector(0.f, 0.f, 20.f);
            if (Drop.Age >= LootMagnetDelay)
            {
                Drop.Position = FMath::VInterpConstantTo(Drop.Position, TargetPos, Dt, LootMagnetSpeed);
                Actor->SetActorLocationAndRotation(Drop.Position, Spin);
            }
            else
            {
                Drop.Position.Z = Drop.BaseZ + 9.0 * FMath::Sin(Drop.Age * 3.8f);
                Actor->SetActorLocationAndRotation(Drop.Position, Spin);
            }

            if (FVector::Dist2D(Drop.Position, TargetPos) <= LootPickupRadius &&
                FMath::Abs(Drop.Position.Z - TargetPos.Z) <= 220.0)
            {
                const FVector CollectedAt = Drop.Position;
                const ETibetLootKind Kind = Drop.Kind;
                Actor->Destroy();
                State.LootDrops.RemoveAt(I);
                CollectLootDrop(Mode, Kind, CollectedAt);
                continue;
            }
        }
        else
        {
            Drop.Position.Z = Drop.BaseZ + 9.0 * FMath::Sin(Drop.Age * 3.8f);
            Actor->SetActorLocationAndRotation(Drop.Position, Spin);
        }
    }
}
