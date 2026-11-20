#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TibetRitualEffect.generated.h"

class UProceduralMeshComponent;
class UMaterialInterface;

UCLASS()
class ATibetRitualEffect : public AActor
{
    GENERATED_BODY()
public:
    ATibetRitualEffect();
    void Start(int32 SkillSlot, const FVector& From, const FVector& To, APawn* Caster,
        UMaterialInterface* Material);
    void StartImpact(const FVector& Position, const FVector& Outward, bool bFinal,
        UMaterialInterface* Material);
    virtual void Tick(float DeltaSeconds) override;
    int32 GetEffectSlot() const { return Slot; }

private:
    UPROPERTY() TObjectPtr<UProceduralMeshComponent> Motif;
    TWeakObjectPtr<APawn> Source;
    FVector Origin, Target;
    FRotator Facing;
    int32 Slot = INDEX_NONE;
    float Age = 0, Duration = 0;
    bool bFinisher = false;
    void Animate();
};
