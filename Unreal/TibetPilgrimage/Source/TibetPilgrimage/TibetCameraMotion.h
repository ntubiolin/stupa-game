#pragma once

#include "CoreMinimal.h"

namespace TibetCamera
{
    constexpr double MinPitch = -62.0;
    constexpr double MaxPitch = 72.0;
    inline FVector2D MouseDegrees(FVector2D Counts)
    {
        return FVector2D(Counts.X * .10, Counts.Y * .085);
    }

    // The caller supplies angular displacement, independent of frame time.
    inline FRotator Turn(FRotator View, FVector2D Degrees, float Sensitivity, bool bInvertY)
    {
        const double PitchDelta = Degrees.Y * (bInvertY ? -Sensitivity : Sensitivity);
        return FRotator(FMath::Clamp(FRotator::NormalizeAxis(View.Pitch) + PitchDelta, MinPitch, MaxPitch),
            FRotator::NormalizeAxis(View.Yaw + Degrees.X * Sensitivity), 0.0);
    }

    // Limit the boom's descent as the lens tilts up, keeping the camera above the ground.
    inline double BoomPitch(double ViewPitch)
    {
        return FMath::Min(FRotator::NormalizeAxis(ViewPitch), 9.0);
    }

    inline double ClearArmFraction(double Previous, double SafeLimit, float DeltaSeconds)
    {
        if (SafeLimit <= Previous) return SafeLimit;
        // Move outward by 90% of the remaining clear distance in about 0.37 s.
        const double Result = SafeLimit + (Previous - SafeLimit) * FMath::Exp(-DeltaSeconds / .16);
        return SafeLimit - Result < .001 ? SafeLimit : Result;
    }
}
