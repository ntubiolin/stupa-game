#include "TibetGuruHalo.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/PackageName.h"
#include "ProceduralMeshComponent.h"

namespace
{
struct FHaloSurface
{
    TArray<FVector> Points;
    TArray<FVector> Normals;
    TArray<int32> Indices;

    void AddTriangle(const FVector& A, const FVector& B, const FVector& C)
    {
        const FVector Normal = FVector::CrossProduct(B - A, C - A).GetSafeNormal();
        if (Normal.IsNearlyZero()) return;
        const int32 Base = Points.Num();
        Points.Append({A, B, C, A, C, B});
        Normals.Append({Normal, Normal, Normal, -Normal, -Normal, -Normal});
        Indices.Append({Base + 2, Base + 1, Base, Base + 5, Base + 4, Base + 3});
    }

    void AddQuad(const FVector& A, const FVector& B, const FVector& C, const FVector& D)
    {
        AddTriangle(A, B, C);
        AddTriangle(A, C, D);
    }

    // Build an elliptical ring in the vertical X-Z plane (normal along Y).
    void AddVerticalRing(float InnerRx, float OuterRx, float InnerRz, float OuterRz, float YOffset, int32 Segments = 56)
    {
        for (int32 I = 0; I < Segments; ++I)
        {
            const float A0 = UE_TWO_PI * float(I) / float(Segments);
            const float A1 = UE_TWO_PI * float(I + 1) / float(Segments);
            const FVector D0(FMath::Cos(A0), 0.f, FMath::Sin(A0));
            const FVector D1(FMath::Cos(A1), 0.f, FMath::Sin(A1));
            const FVector P0(D0.X * InnerRx, YOffset, D0.Z * InnerRz);
            const FVector P1(D0.X * OuterRx, YOffset, D0.Z * OuterRz);
            const FVector P2(D1.X * OuterRx, YOffset, D1.Z * OuterRz);
            const FVector P3(D1.X * InnerRx, YOffset, D1.Z * InnerRz);
            AddQuad(P0, P1, P2, P3);
        }
    }

    void AddVerticalDisc(float Radius, float YOffset, int32 Segments = 48)
    {
        const FVector Center(0.f, YOffset, 0.f);
        for (int32 I = 0; I < Segments; ++I)
        {
            const float A0 = UE_TWO_PI * float(I) / float(Segments);
            const float A1 = UE_TWO_PI * float(I + 1) / float(Segments);
            const FVector P0(FMath::Cos(A0) * Radius, YOffset, FMath::Sin(A0) * Radius);
            const FVector P1(FMath::Cos(A1) * Radius, YOffset, FMath::Sin(A1) * Radius);
            AddTriangle(Center, P0, P1);
        }
    }

    UMaterialInstanceDynamic* Install(UProceduralMeshComponent* Comp, int32 Section,
        UMaterialInterface* BaseMat, const FLinearColor& Color) const
    {
        if (!Comp || Points.IsEmpty()) return nullptr;
        Comp->CreateMeshSection_LinearColor(Section, Points, Indices, Normals, {}, {}, {}, false);
        if (!BaseMat) return nullptr;
        auto* Dyn = Comp->CreateDynamicMaterialInstance(Section, BaseMat);
        if (Dyn) Dyn->SetVectorParameterValue(TEXT("Color"), Color);
        return Dyn;
    }
};

void SetupHaloMeshComponent(UProceduralMeshComponent* Comp, USceneComponent* Parent, const FVector& RelativeLoc)
{
    Comp->SetupAttachment(Parent);
    Comp->SetMobility(EComponentMobility::Movable);
    Comp->SetRelativeLocation(RelativeLoc);
    Comp->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Comp->SetGenerateOverlapEvents(false);
    Comp->SetCastShadow(false);
    Comp->SetCanEverAffectNavigation(false);
}
}

ATibetGuruHalo::ATibetGuruHalo()
{
    PrimaryActorTick.bCanEverTick = true;

    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("GuruHaloRoot"));
    SceneRoot->SetMobility(EComponentMobility::Movable);
    SetRootComponent(SceneRoot);

    // Imported figure meshes face -Y in UE local space, so +Y is directly behind Guru Rinpoche's head and back.
    HeadHalo = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("GuruHeadPrabhamandala"));
    SetupHaloMeshComponent(HeadHalo, SceneRoot, FVector(0.f, 19.f, 162.f));

    HeadRays = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("GuruWisdomLotusRays"));
    SetupHaloMeshComponent(HeadRays, SceneRoot, FVector(0.f, 20.f, 162.f));

    BodyAureole = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("GuruBodyAureole"));
    SetupHaloMeshComponent(BodyAureole, SceneRoot, FVector(0.f, 24.f, 104.f));

    BodySheen = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("GuruPureVisionSheen"));
    BodySheen->SetupAttachment(SceneRoot);
    BodySheen->SetMobility(EComponentMobility::Movable);
    BodySheen->SetRelativeLocation(FVector(0.f, 0.f, -2.5f));
    BodySheen->SetRelativeScale3D(FVector(1.026f));
    BodySheen->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    BodySheen->SetGenerateOverlapEvents(false);
    BodySheen->SetCastShadow(false);
    BodySheen->SetCanEverAffectNavigation(false);
}

void ATibetGuruHalo::ConfigureHalo(bool bInFullBodyRadiance, UMaterialInterface* InRitualMaterial)
{
    bFullBodyRadiance = bInFullBodyRadiance;
    if (InRitualMaterial) HaloMaterial = InRitualMaterial;
    RebuildGeometry();
}

void ATibetGuruHalo::BeginPlay()
{
    Super::BeginPlay();
    if (!bBuilt) RebuildGeometry();
}

void ATibetGuruHalo::RebuildGeometry()
{
    if (!HaloMaterial)
    {
        if (FPackageName::DoesPackageExist(TEXT("/Game/Figures/Materials/M_RitualColor")))
            HaloMaterial = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_RitualColor.M_RitualColor"));
        if (!HaloMaterial && FPackageName::DoesPackageExist(TEXT("/Game/Figures/Materials/M_TravelGlow")))
            HaloMaterial = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow"));
        if (!HaloMaterial)
            HaloMaterial = UMaterial::GetDefaultMaterial(MD_Surface);
    }

    HeadHalo->ClearAllMeshSections();
    HeadRays->ClearAllMeshSections();
    BodyAureole->ClearAllMeshSections();

    // 1. Vertical Head Prabhāmaṇḍala (頭光) centered behind Guru Rinpoche's brow & Padma Lotus Hat (Z = 162 cm).
    {
        FHaloSurface SunDisc;
        SunDisc.AddVerticalDisc(31.5f, 0.f, 48);
        SunDiscMat = SunDisc.Install(HeadHalo, 0, HaloMaterial, FLinearColor(1.50f, 0.96f, 0.22f, 0.34f));

        FHaloSurface RainbowBand;
        RainbowBand.AddVerticalRing(31.5f, 38.5f, 31.5f, 38.5f, -0.35f, 56);
        RainbowBandMat = RainbowBand.Install(HeadHalo, 1, HaloMaterial, FLinearColor(0.14f, 1.25f, 0.98f, 0.64f));

        FHaloSurface CinnabarRim;
        CinnabarRim.AddVerticalRing(38.5f, 44.0f, 38.5f, 44.0f, -0.65f, 56);
        CinnabarRimMat = CinnabarRim.Install(HeadHalo, 2, HaloMaterial, FLinearColor(1.88f, 0.64f, 0.16f, 0.74f));
    }

    // 2. Rotating Golden Mandala Rim + 16 Wisdom-Light Lotus Rays (rotating around local +Y axis, zero gimbal lock).
    {
        FHaloSurface Rays;
        Rays.AddVerticalRing(43.5f, 48.0f, 43.5f, 48.0f, 0.f, 64);
        constexpr int32 RayCount = 16;
        for (int32 K = 0; K < RayCount; ++K)
        {
            const float Angle = UE_TWO_PI * float(K) / float(RayCount);
            const FVector Radial(FMath::Cos(Angle), 0.f, FMath::Sin(Angle));
            const FVector Tangent(-Radial.Z, 0.f, Radial.X);
            const bool bMajor = (K % 2) == 0;
            const float BaseR = 46.5f;
            const float MidR = bMajor ? 57.f : 52.5f;
            const float TipR = bMajor ? 71.f : 59.5f;
            const float HalfW = bMajor ? 4.2f : 2.8f;

            const FVector BaseL = Radial * BaseR - Tangent * (HalfW * 0.72f);
            const FVector BaseRVec = Radial * BaseR + Tangent * (HalfW * 0.72f);
            const FVector MidL = Radial * MidR - Tangent * HalfW;
            const FVector MidRVec = Radial * MidR + Tangent * HalfW;
            const FVector Tip = Radial * TipR;
            Rays.AddQuad(BaseL, BaseRVec, MidRVec, MidL);
            Rays.AddTriangle(MidL, MidRVec, Tip);
        }
        WisdomRaysMat = Rays.Install(HeadRays, 0, HaloMaterial, FLinearColor(2.15f, 1.42f, 0.30f, 0.84f));
    }

    // 3. Concentric Vertical Body Aureole (身光) behind torso & lotus pedestal (Z = 104 cm).
    {
        FHaloSurface OuterAureole;
        OuterAureole.AddVerticalRing(52.f, 59.f, 66.f, 75.f, 0.f, 64);
        constexpr int32 SpokeCount = 12;
        for (int32 K = 0; K < SpokeCount; ++K)
        {
            const float Angle = UE_TWO_PI * float(K) / float(SpokeCount) + (UE_PI / 12.f);
            const FVector Dir(FMath::Cos(Angle) * 58.f, 0.f, FMath::Sin(Angle) * 74.f);
            const FVector OutDir(FMath::Cos(Angle) * 69.f, 0.f, FMath::Sin(Angle) * 87.f);
            const FVector Perp(-FMath::Sin(Angle) * 2.4f, 0.f, FMath::Cos(Angle) * 2.4f);
            OuterAureole.AddTriangle(Dir - Perp, Dir + Perp, OutDir);
        }
        BodyOuterMat = OuterAureole.Install(BodyAureole, 0, HaloMaterial, FLinearColor(1.78f, 1.15f, 0.24f, 0.58f));

        FHaloSurface InnerAureole;
        InnerAureole.AddVerticalRing(45.f, 52.f, 57.f, 66.f, -0.4f, 56);
        BodyInnerMat = InnerAureole.Install(BodyAureole, 1, HaloMaterial, FLinearColor(1.20f, 0.86f, 0.30f, 0.28f));

        if (bFullBodyRadiance)
        {
            // Shimmering Rainbow Thigle Lotus Ring & Ascending Golden Light Pillars around Finale SkyGuru.
            FHaloSurface Celestial;
            constexpr int32 RingSegs = 48;
            for (int32 I = 0; I < RingSegs; ++I)
            {
                const float A0 = UE_TWO_PI * float(I) / float(RingSegs);
                const float A1 = UE_TWO_PI * float(I + 1) / float(RingSegs);
                const FVector C0(FMath::Cos(A0), FMath::Sin(A0), 0.f);
                const FVector C1(FMath::Cos(A1), FMath::Sin(A1), 0.f);
                const FVector CenterOffset(0.f, -24.f, -94.f);
                Celestial.AddQuad(
                    CenterOffset + C0 * 48.f, CenterOffset + C0 * 58.f,
                    CenterOffset + C1 * 58.f, CenterOffset + C1 * 48.f);
            }
            constexpr int32 PillarCount = 8;
            for (int32 K = 0; K < PillarCount; ++K)
            {
                const float Angle = UE_TWO_PI * float(K) / float(PillarCount);
                const FVector Radial(FMath::Cos(Angle) * 44.f, -24.f + FMath::Sin(Angle) * 44.f, 0.f);
                const FVector Tangent(-FMath::Sin(Angle) * 3.2f, FMath::Cos(Angle) * 3.2f, 0.f);
                const FVector BotL = Radial - Tangent + FVector(0.f, 0.f, -90.f);
                const FVector BotR = Radial + Tangent + FVector(0.f, 0.f, -90.f);
                const FVector TopR = Radial + Tangent * 0.35f + FVector(0.f, 0.f, 56.f);
                const FVector TopL = Radial - Tangent * 0.35f + FVector(0.f, 0.f, 56.f);
                Celestial.AddQuad(BotL, BotR, TopR, TopL);
            }
            CelestialPillarsMat = Celestial.Install(BodyAureole, 2, HaloMaterial, FLinearColor(1.65f, 1.15f, 0.32f, 0.30f));
        }
        else
        {
            CelestialPillarsMat = nullptr;
        }
    }

    // 4. Subtle golden Pure Vision body sheen on chapter GuruVision actors (SkyGuru owns its dedicated 1.045x shell).
    if (!bFullBodyRadiance)
    {
        UStaticMesh* GuruMesh = FPackageName::DoesPackageExist(TEXT("/Game/Figures/GuruVision"))
            ? LoadObject<UStaticMesh>(nullptr, TEXT("/Game/Figures/GuruVision.GuruVision"))
            : nullptr;
        if (GuruMesh)
        {
            BodySheen->SetStaticMesh(GuruMesh);
            BodySheen->SetVisibility(true);
            if (HaloMaterial)
            {
                BodySheenMat = UMaterialInstanceDynamic::Create(HaloMaterial, this);
                BodySheenMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.30f, 0.88f, 0.22f, 0.14f));
                const int32 NumMats = BodySheen->GetNumMaterials();
                for (int32 SlotIdx = 0; SlotIdx < NumMats; ++SlotIdx)
                    BodySheen->SetMaterial(SlotIdx, BodySheenMat);
            }
        }
    }
    else
    {
        BodySheen->SetVisibility(false);
        BodySheenMat = nullptr;
    }

    bBuilt = true;
}

int32 ATibetGuruHalo::GetTotalSectionCount() const
{
    int32 Total = 0;
    if (HeadHalo) Total += HeadHalo->GetNumSections();
    if (HeadRays) Total += HeadRays->GetNumSections();
    if (BodyAureole) Total += BodyAureole->GetNumSections();
    return Total;
}

void ATibetGuruHalo::Tick(float Dt)
{
    Super::Tick(Dt);
    AActor* OwnerActor = GetOwner();
    if (OwnerActor)
    {
        if (!IsValid(OwnerActor))
        {
            Destroy();
            return;
        }
        if (IsHidden() != OwnerActor->IsHidden())
            SetActorHiddenInGame(OwnerActor->IsHidden());
    }
    if (IsHidden()) return;

    RaySpinRadians = FMath::Fmod(RaySpinRadians + Dt * 0.34f, UE_TWO_PI);
    if (HeadRays)
    {
        HeadRays->SetRelativeRotation(FQuat(FVector(0.f, 1.f, 0.f), RaySpinRadians));
    }

    const float T = GetGameTimeSinceCreation();
    const float Pulse = 1.f + 0.14f * FMath::Sin(T * 2.4f);
    const float RainbowShift = 0.5f + 0.5f * FMath::Sin(T * 1.55f);

    if (SunDiscMat)
        SunDiscMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.50f * Pulse, 0.96f * Pulse, 0.22f, 0.34f));
    if (RainbowBandMat)
    {
        const FLinearColor Turquoise(0.14f, 1.25f, 0.98f, 0.64f);
        const FLinearColor EmeraldGold(0.42f, 1.32f, 0.68f, 0.64f);
        RainbowBandMat->SetVectorParameterValue(TEXT("Color"), FMath::Lerp(Turquoise, EmeraldGold, RainbowShift));
    }
    if (WisdomRaysMat)
        WisdomRaysMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(2.15f * Pulse, 1.42f * Pulse, 0.30f, 0.84f));
    if (BodyOuterMat)
        BodyOuterMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.78f * Pulse, 1.15f * Pulse, 0.24f, 0.58f));
    if (CelestialPillarsMat)
    {
        const float PillarPulse = 0.88f + 0.22f * FMath::Sin(T * 2.85f + 0.9f);
        CelestialPillarsMat->SetVectorParameterValue(TEXT("Color"),
            FLinearColor(1.65f * PillarPulse, 1.15f * PillarPulse, 0.34f, 0.30f));
    }
    if (BodySheenMat)
    {
        const float SheenAlpha = 0.12f + 0.04f * FMath::Sin(T * 2.1f);
        BodySheenMat->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.30f * Pulse, 0.88f * Pulse, 0.22f, SheenAlpha));
    }
}
