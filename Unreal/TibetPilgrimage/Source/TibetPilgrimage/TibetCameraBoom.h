#pragma once

#include "GameFramework/SpringArmComponent.h"
#include "TibetCameraBoom.generated.h"

UCLASS()
class TIBETPILGRIMAGE_API UTibetCameraBoom : public USpringArmComponent
{
    GENERATED_BODY()

protected:
    virtual FRotator GetDesiredRotation() const override;
    virtual FVector BlendLocations(const FVector& Desired, const FVector& Hit, bool bBlocked,
        float DeltaSeconds) override;

private:
    double ArmFraction = 1.0;
};
