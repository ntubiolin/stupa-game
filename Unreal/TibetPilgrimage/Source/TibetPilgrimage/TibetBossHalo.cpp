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
    for (int32 Layer=0; Layer<2; ++Layer)
    {
        const float Inner = Layer==0 ? 115.f : 144.f, Outer = Layer==0 ? 144.f : 148.f;
        constexpr int32 Segments=48;
        TArray<FVector> Vertices;
        TArray<int32> Indices;
        for (int32 I=0; I<Segments; ++I)
        {
            const float Angle=UE_TWO_PI*I/Segments;
            const FVector Direction(FMath::Cos(Angle),FMath::Sin(Angle),0);
            Vertices.Append({Direction*Inner,Direction*Outer});
            const int32 Here=2*I, Next=2*((I+1)%Segments);
            Indices.Append({Here,Here+1,Next,Next,Here+1,Next+1});
        }
        Rings->CreateMeshSection_LinearColor(Layer,Vertices,Indices,{},{},{},{},false);
        auto* Ink = Rings->CreateDynamicMaterialInstance(Layer, Material);
        Ink->SetVectorParameterValue(TEXT("Color"), Layer==0 ? FLinearColor(1.5f,.13f,.036f) : FLinearColor(2.f,1.02f,.16f));
        if (Layer==0) Ember = Ink;
    }
}

void ATibetBossHalo::Tick(float Dt)
{
    Super::Tick(Dt);
    if (!IsValid(GetOwner())) { Destroy(); return; }
    if (Ember)
    {
        const float Light = 1.f+.16f*FMath::Sin(GetGameTimeSinceCreation()*3.f);
        Ember->SetVectorParameterValue(TEXT("Color"),FLinearColor(1.5f,.13f,.036f)*Light);
    }
}
