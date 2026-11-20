#include "TibetSkyClock.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/PostProcessComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/SkyLight.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

ATibetSkyClock::ATibetSkyClock()
{
    RootComponent=CreateDefaultSubobject<USceneComponent>(TEXT("Sky"));
    Moon=CreateDefaultSubobject<UDirectionalLightComponent>(TEXT("Moonlight"));
    Moon->SetupAttachment(RootComponent);
    Moon->SetMobility(EComponentMobility::Movable);
    Moon->SetCastShadows(false);
    Moon->SetAtmosphereSunLight(true);
    Moon->SetAtmosphereSunLightIndex(1);
    Moon->SetLightSourceAngle(1.05f);
    Moon->SetLightColor(FLinearColor(.38,.53,.86),true);
    Moon->SetRelativeRotation(FRotator(-35,28,0));
    Exposure=CreateDefaultSubobject<UPostProcessComponent>(TEXT("Outdoor exposure"));
    Exposure->SetupAttachment(RootComponent);
    Exposure->bUnbound=true;
    Stars=CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Night sky"));
    Stars->SetupAttachment(RootComponent);
    Stars->SetCastShadow(false);
    Stars->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void ATibetSkyClock::BeginPlay()
{
    Super::BeginPlay();
    if(TActorIterator<ADirectionalLight> It{GetWorld()}; It) Sun=It->FindComponentByClass<UDirectionalLightComponent>();
    if(TActorIterator<ASkyLight> It{GetWorld()}; It) Sky=It->GetLightComponent();
    if(TActorIterator<AExponentialHeightFog> It{GetWorld()}; It) Fog=It->GetComponent();
    TArray<FVector> Points;
    TArray<int32> Faces;
    FRandomStream Random(369);
    const auto Disc=[&](const FVector& Dir,float Size,int32 Sides)
    {
        FVector U,V;
        Dir.FindBestAxisVectors(U,V);
        const FVector Center=Dir*38000;
        const int32 Start=Points.Add(Center);
        for(int32 I=0;I<Sides;++I)
        {
            const double A=I*UE_TWO_PI/Sides;
            Points.Add(Center+Size*(U*FMath::Cos(A)+V*FMath::Sin(A)));
            Faces.Append({Start,Start+1+(I+1)%Sides,Start+1+I});
        }
    };
    for(int32 I=0;I<290;++I)
    {
        const FVector Dir=Random.VRand();
        if(Dir.Z>.12) Disc(Dir,Random.FRandRange(19,53),4);
    }
    Stars->CreateMeshSection_LinearColor(0,Points,Faces,{},{},{},{},false);
    if(auto* Material=LoadObject<UMaterialInterface>(nullptr,TEXT("/Game/Figures/Materials/M_TravelGlow.M_TravelGlow")))
        StarMaterial=Stars->CreateDynamicMaterialInstance(0,Material);
}

float ATibetSkyClock::Daylight(float Phase)
{
    const float Elevation=FMath::Sin((Phase-.25f)*UE_TWO_PI);
    return FMath::SmoothStep(-.14f,.26f,Elevation);
}

void ATibetSkyClock::Apply(float Phase)
{
    const float Elevation=FMath::Sin((Phase-.25f)*UE_TWO_PI), Day=Daylight(Phase), Night=1-Day;
    if (Sun)
    {
        Sun->SetWorldRotation(FRotator(-FMath::RadiansToDegrees(FMath::Asin(Elevation))*.78f,
            24+180*(Phase-.30f),0));
        Sun->SetIntensity(35000*Day);
        Sun->SetTemperature(FMath::Lerp(3900.f,5650.f,FMath::Clamp(Elevation*2.9f,0.f,1.f)));
    }
    Moon->SetIntensity(2.6f*Night);
    Moon->SetVisibility(Night>.004f);
    if(Sky) Sky->SetIntensity(FMath::Lerp(.68f,1.35f,Day));
    if(Fog) Fog->SetFogInscatteringColor(FMath::Lerp(FLinearColor(.009,.018,.058),FLinearColor(.45,.56,.70),Day));
    auto& S=Exposure->Settings;
    S.bOverride_AutoExposureMinBrightness=S.bOverride_AutoExposureMaxBrightness=true;
    S.AutoExposureMinBrightness=FMath::Lerp(3.1f,6.f,Day);
    S.AutoExposureMaxBrightness=FMath::Lerp(4.3f,16.f,Day);
    Stars->SetVisibility(Night>.03f);
    if(StarMaterial) StarMaterial->SetVectorParameterValue(TEXT("Color"),FLinearColor(.69,.80,1.35)*Night);
}
