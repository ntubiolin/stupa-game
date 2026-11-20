#include "TibetTravelGate.h"

#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

namespace
{
// The opening is empty. Narrow tubes give the arch and the two standing lamps
// thickness from both sides, including players returning through the town.
struct FGateMesh
{
    TArray<FVector> Vertices;
    TArray<int32> Indices;

    void Stroke(FVector A, FVector B, double Width)
    {
        FVector U, V;
        (B - A).GetSafeNormal().FindBestAxisVectors(U, V);
        const int32 Start = Vertices.Num();
        for (int32 I = 0; I < 4; ++I)
        {
            const double Angle = UE_HALF_PI * I;
            const FVector Edge = Width * (FMath::Cos(Angle) * U + FMath::Sin(Angle) * V);
            Vertices.Append({A + Edge, B + Edge});
            const int32 J = Start + 2 * I, K = Start + 2 * ((I + 1) % 4);
            Indices.Append({J, K, J + 1, K, K + 1, J + 1});
        }
    }
};
}

ATibetTravelGate::ATibetTravelGate()
{
    PrimaryActorTick.bCanEverTick = true;
    Ribbon = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Travel threshold"));
    SetRootComponent(Ribbon);
    Ribbon->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Ribbon->SetCastShadow(false);
}

void ATibetTravelGate::BeginPlay()
{
    Super::BeginPlay();
    FGateMesh Mesh;
    for (int32 I = 0; I < 48; ++I)
    {
        const auto Point = [](int32 N)
        {
            const double A = N * UE_TWO_PI / 48;
            return FVector(105 * FMath::Cos(A), 120 * FMath::Sin(A), 6);
        };
        Mesh.Stroke(Point(I), Point(I + 1), 3.8);
    }
    for (double Side : {-1., 1.})
    {
        Mesh.Stroke({0, Side * 105, 9}, {0, Side * 105, 153}, 5.5);
        for (int32 I = 0; I < 22; ++I)
        {
            const auto Arch = [Side](int32 N)
            {
                const double A = N * UE_HALF_PI / 22;
                return FVector(0, Side * 105 * FMath::Cos(A), 153 + 108 * FMath::Sin(A));
            };
            Mesh.Stroke(Arch(I), Arch(I + 1), 5.5);
        }
        // A floating pointed jewel above the arch reads at the far end of the approach.
        Mesh.Stroke({0, 0, 268}, {0, Side * 13, 286}, 3.7);
        Mesh.Stroke({0, Side * 13, 286}, {0, 0, 310}, 3.7);
    }
    Ribbon->CreateMeshSection_LinearColor(0, Mesh.Vertices, Mesh.Indices, {}, {}, {}, {}, false);
    auto* Material = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow"));
    if (ensureMsgf(Material, TEXT("Missing generated M_TravelGlow")))
    {
        Ink = Ribbon->CreateDynamicMaterialInstance(0, Material);
        Ink->SetVectorParameterValue(TEXT("Color"), Color);
    }
}

void ATibetTravelGate::SetSidePath()
{
    Color = FLinearColor(1.45f, .77f, .20f);
}

void ATibetTravelGate::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Age += DeltaSeconds;
    Brightness = 1.f + .27f * FMath::Sin(Age * UE_TWO_PI / 2.6f);
    if (Ink) Ink->SetVectorParameterValue(TEXT("Color"), Color * Brightness);
}
