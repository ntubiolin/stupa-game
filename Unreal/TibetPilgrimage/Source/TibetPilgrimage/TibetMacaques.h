#pragma once
#include "GameFramework/Actor.h"
#include "TibetMacaques.generated.h"

UCLASS()
class ATibetMacaques : public AActor
{
    GENERATED_BODY()
public:
    ATibetMacaques();
    virtual void BeginPlay() override;
    virtual void Tick(float Dt) override;
    int32 Nearest(const FVector& Player, double Range=500) const;
    bool Offer(int32 Index, const FVector& From);
    FVector Location(int32 Index) const;
    void SetDaylight(float Value) { Daylight=Value; }
    void Attend(int32 Index) { Attending=Index; }
    bool IsEating(int32 Index) const;
    bool HoldingFruit(int32 Index, FVector& FruitPosition, float& ToeClearance) const;
private:
    struct FAnimal
    {
        FVector Position=FVector::ZeroVector, FruitFrom=FVector::ZeroVector;
        float Angle=0, Home=0, Radius=0, Heading=0, Feeding=-1, Cooldown=0;
        bool bPerched=false;
    };
    TArray<FAnimal> Animals;
    UPROPERTY() TArray<TObjectPtr<class UInstancedStaticMeshComponent>> Parts;
    float Age=0, Daylight=1;
    int32 Attending=INDEX_NONE;
    void Pose(int32 Index, float Dt);
};
