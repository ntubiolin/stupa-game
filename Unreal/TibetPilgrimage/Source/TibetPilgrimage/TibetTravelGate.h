#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TibetTravelGate.generated.h"

UCLASS()
class ATibetTravelGate : public AActor
{
    GENERATED_BODY()
public:
    ATibetTravelGate();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    void SetSidePath();
    float Glow() const { return Brightness; }
private:
    UPROPERTY() TObjectPtr<class UProceduralMeshComponent> Ribbon;
    UPROPERTY() TObjectPtr<class UMaterialInstanceDynamic> Ink;
    FLinearColor Color = FLinearColor(.18f, 1.35f, .89f);
    float Age = 0, Brightness = 1;
};
