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
    FGateMesh Mesh, GoldTrim;
    // Double-ringed sacred lotus threshold mandala on the ground
    for (int32 I = 0; I < 48; ++I)
    {
        const auto Point = [](int32 N, double Rx, double Ry)
        {
            const double A = N * UE_TWO_PI / 48;
            return FVector(Rx * FMath::Cos(A), Ry * FMath::Sin(A), 6);
        };
        Mesh.Stroke(Point(I, 105, 120), Point(I + 1, 105, 120), 3.6);
        GoldTrim.Stroke(Point(I, 92, 106), Point(I + 1, 92, 106), 1.8);
        if (I % 6 == 0)
        {
            GoldTrim.Stroke(Point(I, 78, 90), Point(I, 105, 120), 2.2);
        }
    }
    // Ornate Tibetan Torana Shrine Arch: twin lotus-capital pillars + trilobed arch + Norbu Triple Flame Jewel
    for (double Side : {-1., 1.})
    {
        Mesh.Stroke({0, Side * 105, 9}, {0, Side * 105, 156}, 5.5);
        GoldTrim.Stroke({0, Side * 116, 12}, {0, Side * 94, 12}, 4.2);
        GoldTrim.Stroke({0, Side * 118, 146}, {0, Side * 92, 146}, 4.5);
        GoldTrim.Stroke({0, Side * 122, 156}, {0, Side * 88, 156}, 3.6);
        for (int32 I = 0; I < 24; ++I)
        {
            const auto Arch = [Side](int32 N, double ROffset, double ZBase)
            {
                const double A = N * UE_HALF_PI / 24;
                const double Foil = 6.0 * FMath::Sin(3.0 * A);
                return FVector(0, Side * (ROffset + Foil) * FMath::Cos(A), ZBase + (108 + Foil) * FMath::Sin(A));
            };
            Mesh.Stroke(Arch(I, 105, 156), Arch(I + 1, 105, 156), 5.2);
            GoldTrim.Stroke(Arch(I, 95, 154), Arch(I + 1, 95, 154), 2.4);
        }
        // Crowning Norbu Mebar (Wish-Fulfilling Triple Flame Jewel) above the Torana apex
        GoldTrim.Stroke({0, 0, 268}, {0, Side * 18, 288}, 3.8);
        GoldTrim.Stroke({0, Side * 18, 288}, {0, 0, 316}, 3.8);
        Mesh.Stroke({0, Side * 10, 272}, {0, Side * 28, 294}, 2.6);
        Mesh.Stroke({0, Side * 28, 294}, {0, Side * 8, 308}, 2.4);
    }
    Ribbon->CreateMeshSection_LinearColor(0, Mesh.Vertices, Mesh.Indices, {}, {}, {}, {}, false);
    Ribbon->CreateMeshSection_LinearColor(1, GoldTrim.Vertices, GoldTrim.Indices, {}, {}, {}, {}, false);
    auto* Material = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow"));
    if (ensureMsgf(Material, TEXT("Missing generated M_TravelGlow")))
    {
        Ink = Ribbon->CreateDynamicMaterialInstance(0, Material);
        Ink->SetVectorParameterValue(TEXT("Color"), Color);
        auto* TrimInk = Ribbon->CreateDynamicMaterialInstance(1, Material);
        TrimInk->SetVectorParameterValue(TEXT("Color"), FLinearColor(1.85f, 1.25f, .32f));
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
