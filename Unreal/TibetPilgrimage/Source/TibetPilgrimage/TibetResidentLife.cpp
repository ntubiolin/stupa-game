#include "TibetGameMode.h"
#include "TibetGuruHalo.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/PackageName.h"

namespace
{
enum class EResidentRoutine : uint8
{
    PrayerWheelLama = 0,
    VillageElder,
    AnxiousMessenger,
    EnvoyCamp,
    TerraceKeeper,
    PastureHerder,
    SamyeScholar,
    SamyeKing,
    HermitageYogini,
};

struct FRoutineStop
{
    FVector2D Offset;
    FVector2D LookTarget;
    float WalkSpeed;
    float DwellSeconds;
};

EResidentRoutine ClassifyResidentRoutine(FName Id)
{
    if (Id == TEXT("oldLama")) return EResidentRoutine::PrayerWheelLama;
    if (Id == TEXT("villageElder")) return EResidentRoutine::VillageElder;
    if (Id == TEXT("messenger")) return EResidentRoutine::AnxiousMessenger;
    if (Id == TEXT("envoyLeader")) return EResidentRoutine::EnvoyCamp;
    if (Id == TEXT("palaceKeeper")) return EResidentRoutine::TerraceKeeper;
    if (Id == TEXT("herder")) return EResidentRoutine::PastureHerder;
    if (Id == TEXT("shantarakshita")) return EResidentRoutine::SamyeScholar;
    if (Id == TEXT("trisongDetsen")) return EResidentRoutine::SamyeKing;
    if (Id == TEXT("yesheTsogyal")) return EResidentRoutine::HermitageYogini;
    return EResidentRoutine::PrayerWheelLama;
}

FRoutineStop DescribeRoutineStop(EResidentRoutine Routine, const FString& MapName, bool bDeliveredMessenger, int32 StopIndex)
{
    const int32 Idx = FMath::Abs(StopIndex) % 3;
    switch (Routine)
    {
    case EResidentRoutine::PrayerWheelLama:
    {
        const FVector2D SacredLandmark = (MapName == TEXT("wild")) ? FVector2D(900.f, -900.f) : FVector2D(3400.f, 0.f);
        const FRoutineStop Stops[3] = {
            {FVector2D(52.f, -38.f), SacredLandmark, 70.f, 2.8f},
            {FVector2D(-42.f, 48.f), FVector2D(-2000.f, 0.f), 68.f, 2.1f},
            {FVector2D(26.f, 56.f), SacredLandmark, 70.f, 2.6f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::VillageElder:
    {
        const FRoutineStop Stops[3] = {
            {FVector2D(-56.f, -42.f), FVector2D(-1680.f, -120.f), 72.f, 2.5f},
            {FVector2D(60.f, 38.f), FVector2D(1250.f, -760.f), 74.f, 2.7f},
            {FVector2D(14.f, -58.f), FVector2D(2424.f, -50.f), 72.f, 2.3f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::AnxiousMessenger:
    {
        if (bDeliveredMessenger)
        {
            const FRoutineStop DeliveredStops[3] = {
                {FVector2D(46.f, -34.f), FVector2D(2424.f, -50.f), 72.f, 2.6f},
                {FVector2D(-44.f, 38.f), FVector2D(900.f, -120.f), 72.f, 2.2f},
                {FVector2D(18.f, 48.f), FVector2D(2424.f, -50.f), 72.f, 2.5f},
            };
            return DeliveredStops[Idx];
        }
        const FRoutineStop PacingStops[3] = {
            {FVector2D(-58.f, 30.f), FVector2D(-350.f, -620.f), 102.f, 1.4f},
            {FVector2D(60.f, -28.f), FVector2D(520.f, -250.f), 106.f, 1.5f},
            {FVector2D(8.f, 56.f), FVector2D(-1750.f, -180.f), 98.f, 1.4f},
        };
        return PacingStops[Idx];
    }
    case EResidentRoutine::EnvoyCamp:
    {
        const FRoutineStop Stops[3] = {
            {FVector2D(-56.f, 44.f), FVector2D(1480.f, 1420.f), 78.f, 2.5f},
            {FVector2D(58.f, -46.f), FVector2D(1630.f, -420.f), 80.f, 2.6f},
            {FVector2D(-20.f, -58.f), FVector2D(900.f, 950.f), 76.f, 2.2f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::TerraceKeeper:
    {
        const FRoutineStop Stops[3] = {
            {FVector2D(54.f, -38.f), FVector2D(3500.f, 250.f), 70.f, 2.7f},
            {FVector2D(-56.f, 36.f), FVector2D(-600.f, 0.f), 70.f, 2.4f},
            {FVector2D(16.f, 54.f), FVector2D(1724.f, 680.f), 70.f, 2.4f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::PastureHerder:
    {
        const FRoutineStop Stops[3] = {
            {FVector2D(60.f, -38.f), FVector2D(680.f, -320.f), 80.f, 2.4f},
            {FVector2D(-50.f, 50.f), FVector2D(-900.f, 640.f), 78.f, 2.3f},
            {FVector2D(24.f, 58.f), FVector2D(450.f, 1450.f), 78.f, 2.3f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::SamyeScholar:
    {
        // Abbot Śāntarakṣita at (1420, -210): discusses with King Trisong Detsen (1420, +210) & contemplates Utse (3800, 0).
        const FRoutineStop Stops[3] = {
            {FVector2D(46.f, 34.f), FVector2D(1420.f, 210.f), 72.f, 2.8f},
            {FVector2D(58.f, -22.f), FVector2D(3800.f, 0.f), 72.f, 2.6f},
            {FVector2D(-42.f, 26.f), FVector2D(1420.f, 210.f), 70.f, 2.5f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::SamyeKing:
    {
        // Emperor Trisong Detsen at (1420, +210): converses with Śāntarakṣita (1420, -210) & surveys Utse mandala (3800, 0).
        const FRoutineStop Stops[3] = {
            {FVector2D(46.f, -34.f), FVector2D(1420.f, -210.f), 74.f, 2.8f},
            {FVector2D(58.f, 22.f), FVector2D(3800.f, 0.f), 74.f, 2.6f},
            {FVector2D(-42.f, -26.f), FVector2D(1420.f, -210.f), 72.f, 2.5f},
        };
        return Stops[Idx];
    }
    case EResidentRoutine::HermitageYogini:
    default:
    {
        const FRoutineStop Stops[3] = {
            {FVector2D(52.f, 34.f), FVector2D(2560.f, -280.f), 68.f, 2.9f},
            {FVector2D(-48.f, -42.f), FVector2D(1720.f, -920.f), 68.f, 2.6f},
            {FVector2D(-16.f, 54.f), FVector2D(-400.f, 0.f), 68.f, 2.5f},
        };
        return Stops[Idx];
    }
    }
}

// Compute idle activity posture ("doing something") at a patrol stop.
// Mesh local front is -Y, shoulders along +/-X: negative Roll bows forward, Pitch sways laterally.
void ComputeActivityGesture(EResidentRoutine Routine, bool bDeliveredMessenger, int32 StopIndex, float Now, float Seed,
    float& OutYawScan, float& OutPitchSway, float& OutForwardRoll)
{
    const float T = Now + Seed;
    const int32 Idx = FMath::Abs(StopIndex) % 3;
    OutYawScan = 0.f;
    OutPitchSway = 0.f;
    OutForwardRoll = 0.f;

    switch (Routine)
    {
    case EResidentRoutine::PrayerWheelLama:
    case EResidentRoutine::TerraceKeeper:
    {
        // Continuous Mani prayer-wheel cadence + periodic reverent bow toward the Stupa / sacred peak.
        OutPitchSway = 2.6f * FMath::Sin(T * 3.7f);
        const float BowWave = (Idx != 1) ? FMath::Max(0.f, FMath::Sin(T * 1.45f)) : 0.25f;
        OutForwardRoll = -2.2f - 8.2f * BowWave;
        OutYawScan = 3.2f * FMath::Cos(T * 1.85f);
        break;
    }
    case EResidentRoutine::VillageElder:
    {
        if (Idx == 0)
        {
            // Leaning on carved staff to inspect parched ground/well.
            OutForwardRoll = -7.6f - 1.4f * FMath::Sin(T * 1.8f);
            OutPitchSway = 1.6f * FMath::Sin(T * 1.2f);
        }
        else
        {
            // Scanning across the valley toward the three springs & cliff cave.
            OutYawScan = 17.5f * FMath::Sin(T * 1.15f);
            OutForwardRoll = -2.8f;
            OutPitchSway = 1.4f * FMath::Cos(T * 1.15f);
        }
        break;
    }
    case EResidentRoutine::AnxiousMessenger:
    {
        if (bDeliveredMessenger)
        {
            OutForwardRoll = -3.5f - 4.5f * FMath::Max(0.f, FMath::Sin(T * 1.5f));
            OutPitchSway = 1.5f * FMath::Sin(T * 1.9f);
        }
        else
        {
            // Anxious canyon lookout clutching scripture straps.
            OutYawScan = 25.f * FMath::Sin(T * 2.35f);
            OutForwardRoll = -5.2f - 1.5f * FMath::Abs(FMath::Sin(T * 2.35f));
            OutPitchSway = 2.1f * FMath::Cos(T * 2.35f);
        }
        break;
    }
    case EResidentRoutine::EnvoyCamp:
    {
        if (Idx == 0)
        {
            // Warming hands beside the camp brazier.
            OutForwardRoll = -6.0f - 1.3f * FMath::Sin(T * 2.4f);
            OutPitchSway = 2.2f * FMath::Sin(T * 2.0f);
        }
        else
        {
            // Looking up toward Kyirong Pass Latse through the mountain wind.
            OutYawScan = 14.f * FMath::Sin(T * 1.05f);
            OutForwardRoll = 1.6f;
            OutPitchSway = 1.5f * FMath::Sin(T * 1.3f);
        }
        break;
    }
    case EResidentRoutine::PastureHerder:
    {
        OutYawScan = 21.f * FMath::Sin(T * 1.1f);
        OutPitchSway = 2.3f * FMath::Cos(T * 1.1f);
        OutForwardRoll = -3.8f;
        break;
    }
    case EResidentRoutine::SamyeScholar:
    case EResidentRoutine::SamyeKing:
    {
        // Out-of-phase royal-scholarly dialogue nods & Utse mandala contemplation.
        const float PhaseShift = (Routine == EResidentRoutine::SamyeKing) ? UE_HALF_PI : 0.f;
        if (Idx == 1)
        {
            OutForwardRoll = 1.4f - 2.6f * FMath::Max(0.f, FMath::Sin(T * 1.3f + PhaseShift));
            OutYawScan = 8.f * FMath::Sin(T * 0.9f + PhaseShift);
        }
        else
        {
            OutForwardRoll = -2.0f - 5.2f * FMath::Max(0.f, FMath::Sin(T * 2.2f + PhaseShift));
            OutPitchSway = 2.3f * FMath::Sin(T * 1.7f + PhaseShift);
            OutYawScan = 5.5f * FMath::Cos(T * 1.4f + PhaseShift);
        }
        break;
    }
    case EResidentRoutine::HermitageYogini:
    default:
    {
        // Serene shrine offering bow & contemplative mountain breathing.
        const float MudraBow = FMath::Max(0.f, FMath::Sin(T * 1.2f));
        OutForwardRoll = -2.0f - 5.5f * MudraBow;
        OutPitchSway = 1.4f * FMath::Sin(T * 0.95f);
        OutYawScan = 6.f * FMath::Sin(T * 0.75f);
        break;
    }
    }
}
}

bool ATibetGameMode::IsGuruVisionId(FName Id)
{
    return Id == TEXT("guruVision.pharping") ||
           Id == TEXT("guruVision.mangyul") ||
           Id == TEXT("guruVision.yarlung") ||
           Id.ToString().StartsWith(TEXT("guruVision."));
}

bool ATibetGameMode::IsGuruVisionManifested(FName Id) const
{
    if (!IsGuruVisionId(Id)) return true;
    if (!Save) return false;
    const bool bGlobalPost = Save->bReturnFromTerma || Save->bEpilogue || Save->bComplete;
    if (Id == TEXT("guruVision.pharping"))
        return Map == TEXT("pharping") && (GetStep() >= 6 || Save->Steps.FindRef(TEXT("mangyul")) > 0 || bGlobalPost);
    if (Id == TEXT("guruVision.mangyul"))
        return Map == TEXT("mangyul") && (GetStep() >= 4 || Save->Steps.FindRef(TEXT("yarlung")) > 0 || bGlobalPost);
    if (Id == TEXT("guruVision.yarlung"))
        return Map == TEXT("yarlung") && (GetStep() >= 5 || Save->Steps.FindRef(TEXT("samye")) > 0 || bGlobalPost);
    return bGlobalPost;
}

double ATibetGameMode::GetResidentFloorZ(const AActor* ResidentActor) const
{
    if (!ResidentActor) return 0.0;
    for (const FTibetResidentState& State : ResidentStates)
        if (State.Actor.Get() == ResidentActor) return State.FloorZ;
    return ResidentActor->GetActorLocation().Z;
}

void ATibetGameMode::RegisterSpawnedResident(FName Id, AActor* Actor, const FVector& ResolvedFloorPos, bool bFixedSocketFloor)
{
    if (!Actor) return;
    FTibetResidentState& State = ResidentStates.AddDefaulted_GetRef();
    State.Id = Id;
    State.Actor = Actor;
    State.Home = ResolvedFloorPos;
    State.FloorZ = ResolvedFloorPos.Z;
    State.bFixedSocketFloor = bFixedSocketFloor;
    State.bIsGuruVision = IsGuruVisionId(Id);
    State.Routine = uint8(ClassifyResidentRoutine(Id));
    State.WaypointIndex = ResidentStates.Num() % 3;
    State.PhaseSeed = float(ResidentStates.Num() - 1) * 1.47f;
    State.HeadingYaw = -180.f;

    if (State.bIsGuruVision)
    {
        if (!RitualMaterial)
        {
            RitualMaterial = FPackageName::DoesPackageExist(TEXT("/Game/Figures/Materials/M_RitualColor"))
                ? LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_RitualColor.M_RitualColor"))
                : UMaterial::GetDefaultMaterial(MD_Surface);
        }
        Actor->SetActorLocation(ResolvedFloorPos + FVector(0.f, 0.f, GuruLevitationHeight));
        if (UWorld* World = GetWorld())
        {
            FActorSpawnParameters Spawn;
            Spawn.Owner = Actor;
            if (auto* Halo = World->SpawnActor<ATibetGuruHalo>(Actor->GetActorLocation(), FRotator::ZeroRotator, Spawn))
            {
                Halo->AttachToActor(Actor, FAttachmentTransformRules::SnapToTargetIncludingScale);
                Halo->ConfigureHalo(false, RitualMaterial);
                State.GuruHalo = Halo;
            }
        }
        const bool bVisible = IsGuruVisionManifested(Id);
        Actor->SetActorHiddenInGame(!bVisible);
        if (auto* Halo = State.GuruHalo.Get()) Halo->SetActorHiddenInGame(!bVisible);
    }
    else if (auto* Body = Cast<UStaticMeshComponent>(Actor->GetRootComponent()))
    {
        Body->SetCustomPrimitiveDataFloat(0, 0.f);
        Body->SetCustomPrimitiveDataFloat(1, 0.f);
    }
}

void ATibetGameMode::UpdateResidentVisibility()
{
    for (FTibetResidentState& State : ResidentStates)
    {
        if (!State.bIsGuruVision) continue;
        AActor* Actor = State.Actor.Get();
        if (!IsValid(Actor)) continue;
        const bool bVisible = IsGuruVisionManifested(State.Id);
        Actor->SetActorHiddenInGame(!bVisible);
        if (auto* Halo = State.GuruHalo.Get()) Halo->SetActorHiddenInGame(!bVisible);
    }
}

void ATibetGameMode::UpdateSkyGuruRadiance(float Now)
{
    if (!SkyGuru) return;
    if (SkyGuruAuraMaterial)
    {
        const float Pulse = 1.f + 0.18f * FMath::Sin(Now * 2.15f);
        const float RainbowWarmth = 0.28f + 0.08f * FMath::Sin(Now * 1.35f);
        const float Alpha = 0.32f + 0.06f * FMath::Sin(Now * 1.75f);
        SkyGuruAuraMaterial->SetVectorParameterValue(
            TEXT("Color"), FLinearColor(1.55f * Pulse, 1.05f * Pulse, RainbowWarmth, Alpha));
    }
}

void ATibetGameMode::UpdateResidents(float Dt, const FVector* PilgrimOverride)
{
    const float ClampedDt = FMath::Clamp(Dt, 0.f, 0.1f);
    if (ClampedDt <= 0.f) return;

    UWorld* World = GetWorld();
    const float Now = World ? World->GetTimeSeconds() : 0.f;
    FVector PilgrimPos = FVector::ZeroVector;
    bool bHasPilgrim = false;
    if (PilgrimOverride)
    {
        PilgrimPos = *PilgrimOverride;
        bHasPilgrim = true;
    }
    else if (const APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0))
    {
        PilgrimPos = Pawn->GetActorLocation();
        bHasPilgrim = true;
    }

    const AActor* CurrentActive = IsCampaignComplete() ? nullptr : ActiveResident();

    for (FTibetResidentState& State : ResidentStates)
    {
        AActor* Actor = State.Actor.Get();
        if (!IsValid(Actor)) continue;
        auto* Body = Cast<UStaticMeshComponent>(Actor->GetRootComponent());

        if (State.bIsGuruVision)
        {
            const bool bVisible = IsGuruVisionManifested(State.Id);
            if (Actor->IsHidden() != !bVisible) Actor->SetActorHiddenInGame(!bVisible);
            if (auto* Halo = State.GuruHalo.Get())
                if (Halo->IsHidden() != !bVisible) Halo->SetActorHiddenInGame(!bVisible);
            if (!bVisible) continue;

            const float HoverOffset = GuruLevitationHeight + 7.5f * FMath::Sin(Now * 1.65f + State.PhaseSeed);
            Actor->SetActorLocation(FVector(State.Home.X, State.Home.Y, State.FloorZ + HoverOffset));

            float DesiredYaw = -180.f + 4.f * FMath::Sin(Now * 0.42f + State.PhaseSeed);
            if (bHasPilgrim && FVector::Dist2D(PilgrimPos, State.Home) < 760.0)
                DesiredYaw = (PilgrimPos - State.Home).Rotation().Yaw;
            State.HeadingYaw = FMath::FixedTurn(State.HeadingYaw, DesiredYaw, ClampedDt * 165.f);

            const float HoverPitch = 1.1f * FMath::Sin(Now * 0.95f + State.PhaseSeed);
            const float HoverRoll = -1.5f + 0.9f * FMath::Cos(Now * 1.15f + State.PhaseSeed);
            Actor->SetActorRotation(FRotator(HoverPitch, State.HeadingYaw + 90.f, HoverRoll));
            continue;
        }

        // Brisk escort locomotion for the Indian Scripture Bearer during Pharping canyon escort.
        if (bEscorting && Actor == Messenger && !IsCampaignComplete())
        {
            FVector Pos = Actor->GetActorLocation();
            float MoveSpeed = 0.f;
            if (bHasPilgrim)
            {
                const FVector Delta = PilgrimPos - Pos;
                const double Dist2D = Delta.Size2D();
                if (Dist2D > 95.0 && Dist2D < 1800.0)
                {
                    const double StepDist = FMath::Min<double>(ClampedDt * 470.0, Dist2D - 90.0);
                    const FVector MoveDir = Delta.GetSafeNormal2D();
                    FVector Candidate(Pos.X + MoveDir.X * StepDist, Pos.Y + MoveDir.Y * StepDist, State.FloorZ);
                    State.FloorZ = GroundHeight(Candidate);
                    Pos.X = Candidate.X;
                    Pos.Y = Candidate.Y;
                    MoveSpeed = float(StepDist / ClampedDt);
                    State.HeadingYaw = FMath::FixedTurn(State.HeadingYaw, MoveDir.Rotation().Yaw, ClampedDt * 360.f);
                }
                else if (Dist2D > 5.0)
                {
                    State.HeadingYaw = FMath::FixedTurn(State.HeadingYaw, Delta.Rotation().Yaw, ClampedDt * 280.f);
                }
            }
            State.SpeedAlpha = FMath::FInterpTo(State.SpeedAlpha, FMath::Clamp(MoveSpeed / 320.f, 0.f, 1.25f), ClampedDt, 10.f);
            if (State.SpeedAlpha > 0.03f)
                State.WalkPhase = FMath::Fmod(State.WalkPhase + ClampedDt * (5.5f + MoveSpeed * 0.014f), UE_TWO_PI);

            const float Amp = FMath::Min(State.SpeedAlpha, 1.15f);
            const float BounceZ = FMath::Abs(FMath::Sin(State.WalkPhase)) * 6.0f * Amp;
            const float SwayPitch = FMath::Sin(State.WalkPhase) * 3.4f * Amp;
            const float LeanRoll = -4.8f * Amp;
            Actor->SetActorLocation(FVector(Pos.X, Pos.Y, State.FloorZ + BounceZ));
            Actor->SetActorRotation(FRotator(SwayPitch, State.HeadingYaw + 90.f, LeanRoll));
            if (Body)
            {
                Body->SetCustomPrimitiveDataFloat(0, State.WalkPhase);
                Body->SetCustomPrimitiveDataFloat(1, FMath::Clamp(State.SpeedAlpha, 0.f, 1.f));
            }
            continue;
        }

        // Once the Pharping escort step (Step 8) completes, keep the messenger stationed outside Yangleshö Cave.
        const bool bDeliveredMessenger = (State.Id == TEXT("messenger") && Map == TEXT("pharping") && !bEscorting && GetStep() > 8);
        if (bDeliveredMessenger && FVector::Dist2D(State.Home, FVector(1370.f, -65.f, 0.f)) > 50.0)
        {
            const double CaveApproachZ = GroundHeight(FVector(1370.f, -65.f, State.FloorZ));
            State.Home = FVector(1370.f, -65.f, CaveApproachZ);
            State.FloorZ = CaveApproachZ;
        }

        FVector Pos = Actor->GetActorLocation();
        const bool bIsActive = (Actor == CurrentActive);
        const double DistToPilgrim = bHasPilgrim ? FVector::Dist2D(PilgrimPos, Pos) : 1e9;
        const double HomeDistToPilgrim = bHasPilgrim ? FVector::Dist2D(PilgrimPos, State.Home) : 1e9;
        const double EngageRadius = bIsActive ? 420.0 : 340.0;

        float ActualSpeed = 0.f;
        float TargetHeadingYaw = State.HeadingYaw;
        float ActivityPitch = 0.f;
        float ActivityRoll = 0.f;

        if (bHasPilgrim && DistToPilgrim <= 255.0)
        {
            // Pilgrim is right beside this resident: hold position steadily and turn warmly to greet.
            if (DistToPilgrim > 4.0)
                TargetHeadingYaw = (PilgrimPos - Pos).Rotation().Yaw;
            ActivityPitch = 0.9f * FMath::Sin(Now * 1.6f + State.PhaseSeed);
            ActivityRoll = -2.4f - 1.1f * FMath::Sin(Now * 2.0f + State.PhaseSeed);
        }
        else if (bHasPilgrim && (DistToPilgrim <= EngageRadius || HomeDistToPilgrim <= EngageRadius))
        {
            // Pilgrim is approaching: ease back to Home post (staying well inside 225 cm range) and face Pilgrim.
            const FVector ToHome = State.Home - Pos;
            const double HomeDist = ToHome.Size2D();
            if (HomeDist > 8.0)
            {
                const double StepDist = FMath::Min<double>(ClampedDt * 84.0, HomeDist);
                const FVector Dir = ToHome.GetSafeNormal2D();
                const FVector Candidate(Pos.X + Dir.X * StepDist, Pos.Y + Dir.Y * StepDist, State.FloorZ);
                const double NextFloorZ = State.bFixedSocketFloor ? State.FloorZ : GroundHeight(Candidate);
                if (FMath::Abs(NextFloorZ - State.FloorZ) <= 38.0)
                {
                    Pos.X = Candidate.X;
                    Pos.Y = Candidate.Y;
                    State.FloorZ = NextFloorZ;
                    ActualSpeed = float(StepDist / ClampedDt);
                }
                TargetHeadingYaw = Dir.Rotation().Yaw;
            }
            else
            {
                TargetHeadingYaw = (PilgrimPos - Pos).Rotation().Yaw;
                ActivityRoll = -2.2f;
            }
        }
        else
        {
            // Authentic daily patrol & cultural routine near Home.
            const auto Routine = static_cast<EResidentRoutine>(State.Routine);
            const FRoutineStop Stop = DescribeRoutineStop(Routine, Map, bDeliveredMessenger, State.WaypointIndex);
            const float RadiusScale = bIsActive ? 0.92f : 1.25f;
            const FVector GoalPos = State.Home + FVector(Stop.Offset.X * RadiusScale, Stop.Offset.Y * RadiusScale, 0.f);

            if (State.PauseRemaining > 0.f)
            {
                State.PauseRemaining -= ClampedDt;
                float YawScan = 0.f;
                ComputeActivityGesture(Routine, bDeliveredMessenger, State.WaypointIndex, Now, State.PhaseSeed,
                    YawScan, ActivityPitch, ActivityRoll);
                const FVector LookDelta(Stop.LookTarget.X - Pos.X, Stop.LookTarget.Y - Pos.Y, 0.f);
                if (!LookDelta.IsNearlyZero())
                    TargetHeadingYaw = FRotator::NormalizeAxis(LookDelta.Rotation().Yaw + YawScan);
                if (State.PauseRemaining <= 0.f)
                    State.WaypointIndex = (State.WaypointIndex + 1) % 3;
            }
            else
            {
                const FVector ToGoal = GoalPos - Pos;
                const double GoalDist = ToGoal.Size2D();
                if (GoalDist <= 6.0)
                {
                    State.PauseRemaining = Stop.DwellSeconds;
                }
                else
                {
                    const double StepDist = FMath::Min<double>(ClampedDt * Stop.WalkSpeed, GoalDist);
                    const FVector MoveDir = ToGoal.GetSafeNormal2D();
                    const FVector Candidate(Pos.X + MoveDir.X * StepDist, Pos.Y + MoveDir.Y * StepDist, State.FloorZ);
                    const double NextFloorZ = State.bFixedSocketFloor ? State.FloorZ : GroundHeight(Candidate);
                    if (FMath::Abs(NextFloorZ - State.FloorZ) <= 38.0)
                    {
                        Pos.X = Candidate.X;
                        Pos.Y = Candidate.Y;
                        State.FloorZ = NextFloorZ;
                        ActualSpeed = float(StepDist / ClampedDt);
                        TargetHeadingYaw = MoveDir.Rotation().Yaw;
                        if (GoalDist - StepDist <= 6.0)
                            State.PauseRemaining = Stop.DwellSeconds;
                    }
                    else
                    {
                        State.PauseRemaining = Stop.DwellSeconds;
                    }
                }
            }
        }

        State.HeadingYaw = FMath::FixedTurn(State.HeadingYaw, TargetHeadingYaw, ClampedDt * 240.f);
        State.SpeedAlpha = FMath::FInterpTo(State.SpeedAlpha, FMath::Clamp(ActualSpeed / 76.f, 0.f, 1.15f), ClampedDt, 8.5f);
        if (State.SpeedAlpha > 0.03f)
            State.WalkPhase = FMath::Fmod(State.WalkPhase + ClampedDt * (4.4f + ActualSpeed * 0.052f), UE_TWO_PI);

        const float IdleBlend = FMath::Clamp(1.f - State.SpeedAlpha, 0.f, 1.f);
        const float StepBounceZ = FMath::Abs(FMath::Sin(State.WalkPhase)) * 5.5f * State.SpeedAlpha;
        const float StepSwayPitch = FMath::Sin(State.WalkPhase) * 3.2f * State.SpeedAlpha;
        const float StepLeanRoll = (-3.8f - 1.1f * FMath::Abs(FMath::Cos(State.WalkPhase))) * State.SpeedAlpha;

        Actor->SetActorLocation(FVector(Pos.X, Pos.Y, State.FloorZ + StepBounceZ));
        Actor->SetActorRotation(FRotator(
            StepSwayPitch + ActivityPitch * IdleBlend,
            State.HeadingYaw + 90.f,
            StepLeanRoll + ActivityRoll * IdleBlend));

        if (Body)
        {
            Body->SetCustomPrimitiveDataFloat(0, State.WalkPhase);
            Body->SetCustomPrimitiveDataFloat(1, FMath::Clamp(State.SpeedAlpha, 0.f, 1.f));
        }
    }
}
