#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "TibetCameraSettings.generated.h"

// Device preferences apply to every campaign slot, including a new game.
UCLASS(Config=GameUserSettings)
class TIBETPILGRIMAGE_API UTibetCameraSettings : public UObject
{
    GENERATED_BODY()

public:
    float GetSensitivity() const;
    bool IsVerticalInverted() const { return bInvertVertical; }
    void SetSensitivity(float Value);
    void SetVerticalInverted(bool bValue);

private:
    UPROPERTY(Config) float LookSensitivity = 1.f;
    UPROPERTY(Config) bool bInvertVertical = false;
};
