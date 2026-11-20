#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TibetSkyClock.generated.h"

// Outdoor sky only. The clock can continue in a vault without changing its lamps or exposure.
UCLASS()
class ATibetSkyClock : public AActor
{
    GENERATED_BODY()
public:
    ATibetSkyClock();
    virtual void BeginPlay() override;
    void Apply(float Phase);
    static float Daylight(float Phase);
private:
    UPROPERTY() TObjectPtr<class UDirectionalLightComponent> Sun;
    UPROPERTY() TObjectPtr<class UDirectionalLightComponent> Moon;
    UPROPERTY() TObjectPtr<class USkyLightComponent> Sky;
    UPROPERTY() TObjectPtr<class UExponentialHeightFogComponent> Fog;
    UPROPERTY() TObjectPtr<class UPostProcessComponent> Exposure;
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> Stars;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> StarMaterial;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> WindowPanes;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> StreetPaving;
};
