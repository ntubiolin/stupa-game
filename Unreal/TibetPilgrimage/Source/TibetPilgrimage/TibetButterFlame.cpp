#include "TibetButterFlame.h"
#include "Components/PointLightComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

ATibetButterFlame::ATibetButterFlame()
{
    PrimaryActorTick.bCanEverTick=true;
    RootComponent=CreateDefaultSubobject<USceneComponent>(TEXT("Cotton wick"));
    Flame=CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Butter flame"));
    Flame->SetupAttachment(RootComponent);
    Flame->SetRelativeLocation(FVector(0,0,-10));
    Flame->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Flame->SetCastShadow(false);
}

void ATibetButterFlame::BeginPlay()
{
    Super::BeginPlay();
    Age=FMath::Fmod(FMath::Abs(GetActorLocation().Y),17.f);
    auto* Glow=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow"));
    // Amber outer sheet and a shorter creamy core are concentric parts of the same wick.
    for (int32 Section=0;Section<2;++Section)
    {
        TArray<FVector> Vertices;
        TArray<int32> Faces;
        const FVector2D Profile[]={{0,1.4},{3,4.4},{8,5.4},{13,3.8},{19,2},{25,.1}};
        for(int32 J=0;J<UE_ARRAY_COUNT(Profile);++J)
        {
            for(int32 I=0;I<12;++I)
            {
                const double A=I*UE_TWO_PI/12.;
                const double Z=Profile[J].X, R=Profile[J].Y;
                if(Section==0) Vertices.Add(FVector(R*FMath::Cos(A)+Z*Z*.005,R*FMath::Sin(A),Z));
                else Vertices.Add(FVector(R*.67*FMath::Cos(A)+1.3,R*.67*FMath::Sin(A)-3.,Z*.67));
                if(J>0)
                {
                    const int32 B=(J-1)*12+I,C=(J-1)*12+(I+1)%12;
                    Faces.Append({B,C,B+12,C,C+12,B+12});
                }
            }
        }
        Flame->CreateMeshSection_LinearColor(Section,Vertices,Faces,{},{},{},{},false);
        if(Glow)
            Flame->CreateDynamicMaterialInstance(Section,Glow)->SetVectorParameterValue(TEXT("Color"),
                Section==0?FLinearColor(3.2,.67,.05):FLinearColor(4.2,2.55,.69));
    }
}
void ATibetButterFlame::LightCourtyardBowl()
{
    if (BowlLight) return;
    BowlLight=NewObject<UPointLightComponent>(this);
    BowlLight->SetupAttachment(RootComponent);
    BowlLight->SetMobility(EComponentMobility::Movable);
    BowlLight->SetCastShadows(false);
    BowlLight->SetIntensityUnits(ELightUnits::Candelas);
    BowlLight->SetIntensity(62);
    BowlLight->SetAttenuationRadius(270);
    BowlLight->SetLightColor(FLinearColor(1,.44,.12),false);
    BowlLight->RegisterComponent();
}
void ATibetButterFlame::Tick(float Dt)
{
    Super::Tick(Dt);
    Age+=Dt;
    Flicker=1+.12f*FMath::Sin(Age*6.8f)+.068f*FMath::Sin(Age*12.1f);
    Flame->SetRelativeScale3D(FVector(1.02f/Flicker,1,Flicker));
    Flame->SetRelativeRotation(FRotator(8*FMath::Sin(Age*4.3f),0,7*FMath::Sin(Age*3.4f)));
    if(BowlLight) BowlLight->SetIntensity(62*Flicker);
}
