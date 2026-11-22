#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TibetGuruHalo.generated.h"

UCLASS()
class TIBETPILGRIMAGE_API ATibetGuruHalo : public AActor
{
    GENERATED_BODY()
public:
    ATibetGuruHalo();
    void ConfigureHalo(bool bInFullBodyRadiance, class UMaterialInterface* InRitualMaterial = nullptr);
    virtual void BeginPlay() override;
    virtual void Tick(float Dt) override;

    bool HasFullBodyRadiance() const { return bFullBodyRadiance; }
    int32 GetTotalSectionCount() const;
    class UProceduralMeshComponent* GetHeadHaloComponent() const { return HeadHalo; }
    class UProceduralMeshComponent* GetHeadRaysComponent() const { return HeadRays; }
    class UProceduralMeshComponent* GetBodyAureoleComponent() const { return BodyAureole; }
    class UStaticMeshComponent* GetBodySheenComponent() const { return BodySheen; }

private:
    void RebuildGeometry();

    UPROPERTY() TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> HeadHalo;
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> HeadRays;
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> BodyAureole;
    UPROPERTY() TObjectPtr<class UStaticMeshComponent> BodySheen;
    UPROPERTY() TObjectPtr<class UMaterialInterface> HaloMaterial;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> SunDiscMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> RainbowBandMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> CinnabarRimMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> WisdomRaysMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> BodyOuterMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> BodyInnerMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> CelestialPillarsMat;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> BodySheenMat;

    bool bFullBodyRadiance = false;
    bool bBuilt = false;
    float RaySpinRadians = 0.f;
};
