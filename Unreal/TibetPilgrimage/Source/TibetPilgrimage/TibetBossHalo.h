#pragma once

#include "GameFramework/Actor.h"
#include "TibetBossHalo.generated.h"

UCLASS()
class ATibetBossHalo : public AActor
{
    GENERATED_BODY()
public:
    ATibetBossHalo();
    virtual void BeginPlay() override;
    virtual void Tick(float Dt) override;
private:
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> Rings;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> Ember;
};
