#include "TibetSkyClock.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/PostProcessComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"
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
    Moon->SetLightColor(FLinearColor(.69,.80,1.),true);
    // Shine across the south approach to model the white dome and the gilt rings.
    Moon->SetRelativeRotation(FRotator(-40,32,0));
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

    TArray<AActor*> Shopfronts;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("BoudhaShopfronts"), Shopfronts);
    for (AActor* Building : Shopfronts)
    {
        TInlineComponentArray<UStaticMeshComponent*> Meshes(Building);
        for (UStaticMeshComponent* Mesh : Meshes)
        {
            for (int32 Slot = 0; Slot < Mesh->GetNumMaterials(); ++Slot)
            {
                UMaterialInterface* Surface = Mesh->GetMaterial(Slot);
                if (!Surface) continue;
                if (Surface->GetFName() == TEXT("litglass"))
                    WindowPanes = Mesh->CreateDynamicMaterialInstance(Slot);
                else if (Surface->GetFName() == TEXT("paving"))
                    StreetPaving = Mesh->CreateDynamicMaterialInstance(Slot);
            }
        }
    }
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
    // The outdoor key remains directional at night, while the exposure range
    // below lets the shaded side of landmarks and paths retain their detail.
    Moon->SetIntensity(18.f*Night);
    const FLinearColor WindowColor(1.f,.52f,.20f);
    if (WindowPanes) WindowPanes->SetVectorParameterValue(TEXT("EmissiveFactor"), WindowColor * (5.5f * Night));
    if (StreetPaving) StreetPaving->SetVectorParameterValue(TEXT("EmissiveFactor"), WindowColor * (1.30f * Night));
    Moon->SetVisibility(Night>.004f);
    if(Sky) Sky->SetIntensity(FMath::Lerp(1.05f,1.35f,Day));
    if(Fog) Fog->SetFogInscatteringColor(FMath::Lerp(FLinearColor(.009,.018,.058),FLinearColor(.45,.56,.70),Day));
    auto& S=Exposure->Settings;
    S.bOverride_AutoExposureMinBrightness=S.bOverride_AutoExposureMaxBrightness=true;
    S.AutoExposureMinBrightness=FMath::Lerp(1.6f,6.f,Day);
    S.AutoExposureMaxBrightness=FMath::Lerp(2.8f,16.f,Day);
    Stars->SetVisibility(Night>.03f);
    if(StarMaterial) StarMaterial->SetVectorParameterValue(TEXT("Color"),FLinearColor(.69,.80,1.35)*Night);
}
