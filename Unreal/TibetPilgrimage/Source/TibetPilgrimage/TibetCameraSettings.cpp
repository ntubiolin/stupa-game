#include "TibetCameraSettings.h"

float UTibetCameraSettings::GetSensitivity() const
{
    return FMath::IsFinite(LookSensitivity) ? FMath::Clamp(LookSensitivity, .5f, 2.f) : 1.f;
}

void UTibetCameraSettings::SetSensitivity(float Value)
{
    LookSensitivity = FMath::IsFinite(Value) ? FMath::Clamp(Value, .5f, 2.f) : 1.f;
    SaveConfig();
}

void UTibetCameraSettings::SetVerticalInverted(bool bValue)
{
    bInvertVertical = bValue;
    SaveConfig();
}
