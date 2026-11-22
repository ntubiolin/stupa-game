#pragma once
#include "GameFramework/Actor.h"
#include "TibetButterFlame.generated.h"

UCLASS()
class ATibetButterFlame : public AActor
{
    GENERATED_BODY()
public:
    ATibetButterFlame();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    void LightCourtyardBowl();
    float GetFlicker() const { return Flicker; }
private:
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> Flame;
    UPROPERTY() TObjectPtr<class UPointLightComponent> BowlLight;
    float Age=0, Flicker=1;
};
