#include "TibetBossHalo.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

ATibetBossHalo::ATibetBossHalo()
{
    PrimaryActorTick.bCanEverTick = true;
    Rings = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Boss foot halo"));
    SetRootComponent(Rings);
    Rings->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Rings->SetCastShadow(false);
    Rings->SetAbsolute(false, true, true);
}

void ATibetBossHalo::BeginPlay()
{
    Super::BeginPlay();
    // Web bossBase's 1.15–1.48 metre foot halo. A narrow gold rim keeps the
    // edge readable on both sunlit sand and the dark vault floor.
    auto* Material = LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow"));
    if (!ensure(Material)) return;
    for (int32 Layer=0; Layer<3; ++Layer)
    {
        const float Inner = Layer==0 ? 115.f : (Layer==1 ? 142.f : 94.f);
        const float Outer = Layer==0 ? 142.f : (Layer==1 ? 148.f : 100.f);
        constexpr int32 Segments=64;
        TArray<FVector> Vertices;
        TArray<int32> Indices;
        for (int32 I=0; I<Segments; ++I)
        {
            const float Angle=UE_TWO_PI*I/Segments;
            const FVector Direction(FMath::Cos(Angle),FMath::Sin(Angle),0);
            const float LotusMod = Layer==2 ? 12.f * FMath::Abs(FMath::Cos(4.f * Angle)) : 0.f;
            Vertices.Append({Direction*Inner, Direction*(Outer + LotusMod)});
            const int32 Here=2*I, Next=2*((I+1)%Segments);
            Indices.Append({Here,Here+1,Next,Next,Here+1,Next+1});
        }
        // Eight crossed-vajra spokes on Layer 2 for an unmistakable Tibetan boss mandala
        if (Layer == 2)
        {
            for (int32 K = 0; K < 8; ++K)
            {
                const float A = UE_TWO_PI * K / 8.f;
                const FVector Dir(FMath::Cos(A), FMath::Sin(A), 0), Perp(-Dir.Y, Dir.X, 0);
                const int32 Base = Vertices.Num();
                Vertices.Append({Dir * 98.f - Perp * 3.f, Dir * 98.f + Perp * 3.f,
                                 Dir * 142.f + Perp * 1.5f, Dir * 142.f - Perp * 1.5f});
                Indices.Append({Base, Base + 1, Base + 2, Base, Base + 2, Base + 3});
            }
        }
        Rings->CreateMeshSection_LinearColor(Layer,Vertices,Indices,{},{},{},{},false);
        auto* Ink = Rings->CreateDynamicMaterialInstance(Layer, Material);
        const FLinearColor LayerColor = Layer==0 ? FLinearColor(1.65f,.12f,.04f)
            : (Layer==1 ? FLinearColor(2.2f,1.18f,.22f) : FLinearColor(1.95f,.76f,.14f));
        Ink->SetVectorParameterValue(TEXT("Color"), LayerColor);
        if (Layer==0) Ember = Ink;
    }
}

void ATibetBossHalo::Tick(float Dt)
{
    Super::Tick(Dt);
    if (!IsValid(GetOwner())) { Destroy(); return; }
    Rings->AddLocalRotation(FRotator(0.f, Dt * 14.f, 0.f));
    if (Ember)
    {
        const float Light = 1.f+.18f*FMath::Sin(GetGameTimeSinceCreation()*3.2f);
        Ember->SetVectorParameterValue(TEXT("Color"),FLinearColor(1.65f,.12f,.04f)*Light);
    }
}
