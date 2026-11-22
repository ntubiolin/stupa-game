#include "TibetGameMode.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace
{
const TCHAR* BasicCubePath = TEXT("/Engine/BasicShapes/Cube.Cube");
const TCHAR* BasicCylinderPath = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
const TCHAR* BasicSpherePath = TEXT("/Engine/BasicShapes/Sphere.Sphere");
const TCHAR* BasicConePath = TEXT("/Engine/BasicShapes/Cone.Cone");
const TCHAR* RitualMatPath = TEXT("/Game/Figures/Materials/M_RitualColor.M_RitualColor");
const TCHAR* OpaqueGlowMatPath = TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow");

UStaticMeshComponent* AttachRitualShape(AActor* Owner, const TCHAR* Name, UStaticMesh* Mesh,
    UMaterialInterface* BaseMaterial, const FVector& RelativeLocation, const FRotator& RelativeRotation,
    const FVector& RelativeScale, const FLinearColor& Color)
{
    if (!Owner || !Mesh) return nullptr;
    auto* Part = NewObject<UStaticMeshComponent>(Owner, Name);
    Part->SetupAttachment(Owner->GetRootComponent());
    Part->SetMobility(EComponentMobility::Movable);
    Part->SetStaticMesh(Mesh);
    Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Part->SetCastShadow(false);
    Part->SetRelativeLocation(RelativeLocation);
    Part->SetRelativeRotation(RelativeRotation);
    Part->SetRelativeScale3D(RelativeScale);
    if (BaseMaterial)
    {
        if (auto* Dynamic = Part->CreateDynamicMaterialInstance(0, BaseMaterial))
        {
            Dynamic->SetVectorParameterValue(TEXT("Color"), Color);
        }
    }
    Part->RegisterComponent();
    return Part;
}
}

FVector ATibetGameMode::MangyulAltarLocation(int32 Index)
{
    const int32 Clamped = FMath::Clamp(Index, 0, MangyulAltarCount - 1);
    const int32 Row = Clamped / 2;
    const double Side = (Clamped % 2) ? 1.0 : -1.0;
    const double X = -900.0 + Row * 420.0;
    const double Y = Side * (820.0 + (Row % 2) * 240.0);
    return FVector(X, Y, 0.0);
}

AActor* ATibetGameMode::SpawnTenmaAltarFocus(const FVector& AltarBase)
{
    UWorld* World = GetWorld();
    if (!World) return nullptr;
    if (!RitualMaterial) RitualMaterial = LoadObject<UMaterialInterface>(nullptr, RitualMatPath);
    auto* CylinderMesh = LoadObject<UStaticMesh>(nullptr, BasicCylinderPath);
    auto* SphereMesh = LoadObject<UStaticMesh>(nullptr, BasicSpherePath);

    AActor* Beacon = World->SpawnActor<AActor>();
    if (!Beacon) return nullptr;
    auto* Root = NewObject<USceneComponent>(Beacon, TEXT("TenmaAltarFocusRoot"));
    Root->SetMobility(EComponentMobility::Movable);
    Beacon->SetRootComponent(Root);
    Root->RegisterComponent();
    // Keep actor root at Z = 0 so floor & distance checks in InteractionAt / QA pathing align cleanly.
    Beacon->SetActorLocation(AltarBase);
    Beacon->Tags.Add(TEXT("TenmaAltarFocus"));

    const FLinearColor BaseHaloGold(1.25f, 0.82f, 0.18f, 0.80f);
    const FLinearColor CrownGold(1.45f, 0.98f, 0.24f, 0.92f);
    const FLinearColor SpireGold(1.65f, 1.15f, 0.30f, 0.95f);

    AttachRitualShape(Beacon, TEXT("GroundRing"), CylinderMesh, RitualMaterial,
        FVector(0.0, 0.0, 5.0), FRotator::ZeroRotator, FVector(2.36, 2.36, 0.04), BaseHaloGold);
    AttachRitualShape(Beacon, TEXT("AltarCrownDisc"), CylinderMesh, RitualMaterial,
        FVector(0.0, 0.0, 120.0), FRotator::ZeroRotator, FVector(1.18, 1.18, 0.10), CrownGold);
    AttachRitualShape(Beacon, TEXT("AltarSpireBeacon"), SphereMesh, RitualMaterial,
        FVector(0.0, 0.0, 196.0), FRotator::ZeroRotator, FVector(0.26, 0.26, 0.40), SpireGold);
    return Beacon;
}

AActor* ATibetGameMode::SpawnTenmaOathStone(int32 Index)
{
    UWorld* World = GetWorld();
    if (!World) return nullptr;
    if (!RitualMaterial) RitualMaterial = LoadObject<UMaterialInterface>(nullptr, RitualMatPath);
    UMaterialInterface* OpaqueMat = LoadObject<UMaterialInterface>(nullptr, OpaqueGlowMatPath);
    if (!OpaqueMat) OpaqueMat = RitualMaterial;
    UMaterialInterface* HaloMat = RitualMaterial ? RitualMaterial.Get() : OpaqueMat;

    auto* CubeMesh = LoadObject<UStaticMesh>(nullptr, BasicCubePath);
    auto* CylinderMesh = LoadObject<UStaticMesh>(nullptr, BasicCylinderPath);
    auto* SphereMesh = LoadObject<UStaticMesh>(nullptr, BasicSpherePath);
    auto* ConeMesh = LoadObject<UStaticMesh>(nullptr, BasicConePath);
    if (!CubeMesh || !CylinderMesh || !SphereMesh) return nullptr;

    AActor* Stone = World->SpawnActor<AActor>();
    if (!Stone) return nullptr;
    auto* Root = NewObject<USceneComponent>(Stone, TEXT("TenmaOathStoneRoot"));
    Root->SetMobility(EComponentMobility::Movable);
    Stone->SetRootComponent(Root);
    Root->RegisterComponent();

    const FVector AltarTop = MangyulAltarLocation(Index) + FVector(0.0, 0.0, 116.0);
    Stone->SetActorLocation(AltarTop);
    // Orient +X inward toward the central Mangyul Pass trail (Y = 0) so the carved Mani tablet faces the pilgrim.
    Stone->SetActorRotation(FRotator(0.0, (Index % 2) ? -90.0 : 90.0, 0.0));
    Stone->Tags.Add(TEXT("TenmaOathStone"));
    Stone->Tags.Add(FName(*FString::Printf(TEXT("TenmaOathStone_%d"), Index)));

    const FLinearColor SacredGoldHalo(1.45f, 1.05f, 0.28f, 0.95f);
    const FLinearColor TurquoiseHalo(0.18f, 1.35f, 1.25f, 0.92f);
    const FLinearColor AlabasterPlinth(0.92f, 0.88f, 0.78f, 1.0f);
    const FLinearColor ManiSlate(0.86f, 0.90f, 0.94f, 1.0f);
    const FLinearColor CinnabarFrame(0.82f, 0.18f, 0.14f, 1.0f);
    const FLinearColor GildedBronze(1.55f, 1.08f, 0.24f, 1.0f);
    const FLinearColor LuminousTurquoise(0.18f, 1.55f, 1.38f, 1.0f);

    // 1. Radiant Samaya gold & turquoise halo rings crowning the stone altar shoulder (zero PointLights).
    AttachRitualShape(Stone, TEXT("SamayaGoldHalo"), CylinderMesh, HaloMat,
        FVector(0.0, 0.0, -10.0), FRotator::ZeroRotator, FVector(1.48, 1.48, 0.07), SacredGoldHalo);
    AttachRitualShape(Stone, TEXT("SamayaTurquoiseDisc"), CylinderMesh, HaloMat,
        FVector(0.0, 0.0, -6.0), FRotator::ZeroRotator, FVector(1.18, 1.18, 0.06), TurquoiseHalo);

    // 2. Carved Tibetan Mani Oath Stele perched on the trail-facing altar ledge.
    AttachRitualShape(Stone, TEXT("LotusPlinth"), CubeMesh, OpaqueMat,
        FVector(34.0, 0.0, -4.0), FRotator::ZeroRotator, FVector(0.34, 0.58, 0.14), AlabasterPlinth);
    AttachRitualShape(Stone, TEXT("CinnabarFrame"), CubeMesh, OpaqueMat,
        FVector(34.0, 0.0, 31.0), FRotator(-4.0, 0.0, 0.0), FVector(0.18, 0.53, 0.56), CinnabarFrame);
    AttachRitualShape(Stone, TEXT("ManiTablet"), CubeMesh, OpaqueMat,
        FVector(34.0, 0.0, 31.0), FRotator(-4.0, 0.0, 0.0), FVector(0.22, 0.46, 0.62), ManiSlate);

    // 3. Embossed Samaya Vajra-Melong golden mirror, turquoise jewel & carved mantra bands on the front face.
    AttachRitualShape(Stone, TEXT("MelongMirror"), CylinderMesh, OpaqueMat,
        FVector(45.5, 0.0, 34.0), FRotator(86.0, 0.0, 0.0), FVector(0.26, 0.26, 0.04), GildedBronze);
    AttachRitualShape(Stone, TEXT("TurquoiseSeal"), SphereMesh, OpaqueMat,
        FVector(47.2, 0.0, 34.0), FRotator::ZeroRotator, FVector(0.15, 0.15, 0.15), LuminousTurquoise);
    AttachRitualShape(Stone, TEXT("UpperMantraBand"), CubeMesh, OpaqueMat,
        FVector(45.0, 0.0, 52.0), FRotator(-4.0, 0.0, 0.0), FVector(0.03, 0.34, 0.045), GildedBronze);
    AttachRitualShape(Stone, TEXT("LowerMantraBand"), CubeMesh, OpaqueMat,
        FVector(45.5, 0.0, 16.0), FRotator(-4.0, 0.0, 0.0), FVector(0.03, 0.36, 0.045), LuminousTurquoise);

    // 4. Gilded chorten finial & crystal spire samaya jewel so every completed altar shines across the pass.
    if (ConeMesh)
    {
        AttachRitualShape(Stone, TEXT("TabletFinialCone"), ConeMesh, OpaqueMat,
            FVector(32.0, 0.0, 68.0), FRotator::ZeroRotator, FVector(0.22, 0.22, 0.16), GildedBronze);
    }
    AttachRitualShape(Stone, TEXT("TabletFinialGem"), SphereMesh, OpaqueMat,
        FVector(32.0, 0.0, 78.0), FRotator::ZeroRotator, FVector(0.11, 0.11, 0.11), LuminousTurquoise);
    AttachRitualShape(Stone, TEXT("SpireGoldCollar"), CylinderMesh, OpaqueMat,
        FVector(0.0, 0.0, 68.0), FRotator::ZeroRotator, FVector(0.34, 0.34, 0.05), GildedBronze);
    AttachRitualShape(Stone, TEXT("SpireSamayaJewel"), SphereMesh, OpaqueMat,
        FVector(0.0, 0.0, 80.0), FRotator::ZeroRotator, FVector(0.26, 0.26, 0.38), LuminousTurquoise);

    return Stone;
}

AActor* ATibetGameMode::SpawnMangyulLatseFlags(const FVector& LatseAnchor)
{
    UWorld* World = GetWorld();
    if (!World) return nullptr;
    if (!RitualMaterial) RitualMaterial = LoadObject<UMaterialInterface>(nullptr, RitualMatPath);
    UMaterialInterface* OpaqueMat = LoadObject<UMaterialInterface>(nullptr, OpaqueGlowMatPath);
    if (!OpaqueMat) OpaqueMat = RitualMaterial;

    auto* CubeMesh = LoadObject<UStaticMesh>(nullptr, BasicCubePath);
    auto* CylinderMesh = LoadObject<UStaticMesh>(nullptr, BasicCylinderPath);
    auto* SphereMesh = LoadObject<UStaticMesh>(nullptr, BasicSpherePath);
    if (!CubeMesh || !CylinderMesh || !SphereMesh) return nullptr;

    AActor* Garland = World->SpawnActor<AActor>();
    if (!Garland) return nullptr;
    auto* Root = NewObject<USceneComponent>(Garland, TEXT("MangyulLatseFlagsRoot"));
    Root->SetMobility(EComponentMobility::Movable);
    Garland->SetRootComponent(Root);
    Root->RegisterComponent();
    Garland->SetActorLocation(LatseAnchor + FVector(0.0, -140.0, 0.0));
    Garland->Tags.Add(TEXT("MangyulLatseFlags"));

    const FLinearColor PoleCrimson(0.72f, 0.16f, 0.14f, 1.0f);
    const FLinearColor FinialGold(1.50f, 1.05f, 0.24f, 1.0f);
    const FLinearColor LungtaColors[5] = {
        FLinearColor(0.18f, 0.42f, 0.92f, 1.0f), // Sky Blue
        FLinearColor(0.95f, 0.93f, 0.86f, 1.0f), // Cloud White
        FLinearColor(0.86f, 0.22f, 0.18f, 1.0f), // Fire Red
        FLinearColor(0.20f, 0.68f, 0.44f, 1.0f), // Water/Meadow Green
        FLinearColor(0.96f, 0.78f, 0.22f, 1.0f), // Earth Yellow
    };

    AttachRitualShape(Garland, TEXT("LatseMast"), CylinderMesh, OpaqueMat,
        FVector(0.0, 0.0, 185.0), FRotator::ZeroRotator, FVector(0.10, 0.10, 3.70), PoleCrimson);
    AttachRitualShape(Garland, TEXT("LatseFinial"), SphereMesh, OpaqueMat,
        FVector(0.0, 0.0, 378.0), FRotator::ZeroRotator, FVector(0.22, 0.22, 0.28), FinialGold);

    for (int32 I = 0; I < 10; ++I)
    {
        const double T = (I + 0.5) / 10.0;
        const FVector FlagPos(0.0, -240.0 * T, 355.0 - 115.0 * T - 18.0 * FMath::Sin(UE_PI * T));
        AttachRitualShape(Garland, *FString::Printf(TEXT("LungtaFlag_%d"), I), CubeMesh, OpaqueMat,
            FlagPos, FRotator(8.0, 12.0 * ((I % 2) ? 1.0 : -1.0), -24.0),
            FVector(0.03, 0.22, 0.30), LungtaColors[I % 5]);
    }
    return Garland;
}

void ATibetGameMode::RefreshMangyulAltars()
{
    if (!Save || !GetWorld() || Map != TEXT("mangyul")) return;
    const int32 Step = GetStep();
    const int32 Placed = (Step > 1 || Save->bReturnFromTerma || Save->bEpilogue || Save->bComplete)
        ? MangyulAltarCount
        : (Step == 1 ? FMath::Clamp(GetStepProgress(), 0, MangyulAltarCount) : 0);

    while (PlacedTenmaStones > Placed)
    {
        --PlacedTenmaStones;
        if (TenmaStoneActors.IsValidIndex(PlacedTenmaStones) && TenmaStoneActors[PlacedTenmaStones])
        {
            TenmaStoneActors[PlacedTenmaStones]->Destroy();
        }
        if (TenmaStoneActors.Num() > PlacedTenmaStones)
        {
            TenmaStoneActors.SetNum(PlacedTenmaStones);
        }
    }

    while (PlacedTenmaStones < Placed)
    {
        AActor* Stone = SpawnTenmaOathStone(PlacedTenmaStones);
        if (!Stone) break;
        TenmaStoneActors.Add(Stone);
        ++PlacedTenmaStones;
    }

    const bool bShouldShowLatseFlags = (Step > 5 || Save->bReturnFromTerma || Save->bEpilogue || Save->bComplete);
    if (bShouldShowLatseFlags && !bSpawnedMangyulLatseFlags)
    {
        if (AActor* FlagsActor = SpawnMangyulLatseFlags(FVector(1630.0, -420.0, 0.0)))
        {
            MangyulLatseFlagsActor = FlagsActor;
            bSpawnedMangyulLatseFlags = true;
        }
    }
    else if (!bShouldShowLatseFlags && bSpawnedMangyulLatseFlags)
    {
        if (MangyulLatseFlagsActor) MangyulLatseFlagsActor->Destroy();
        MangyulLatseFlagsActor = nullptr;
        bSpawnedMangyulLatseFlags = false;
    }
}
