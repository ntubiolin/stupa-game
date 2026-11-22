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

    constexpr double OrbitDegreesPerSecond = 105.;
    constexpr double InteractHoldSeconds = .20;
    constexpr double AutoBehindDegreesPerSecond = 88.;
    constexpr double AutoBehindTimeConstant = .24;
    constexpr double LateralInputDeadzone = .05;

    inline double StepYawToward(double View, double Target, double Rate, double TimeConstant, double Dt)
    {
        if (Rate <= 0. || Dt <= 0.) return FRotator::NormalizeAxis(View);
        const double EaseDistance = Rate * TimeConstant;
        const double Gap = FRotator::NormalizeAxis(Target - View);
        const double Distance = FMath::Abs(Gap);
        const double LinearTime = FMath::Min(Dt, FMath::Max(0., Distance - EaseDistance) / Rate);
        const double Remaining = (Distance - Rate * LinearTime) * FMath::Exp(-(Dt - LinearTime) / TimeConstant);
        return FRotator::NormalizeAxis(Target - (Remaining < .05 ? 0. : FMath::Sign(Gap) * Remaining));
    }

    inline double FollowYaw(double View, double Travel, double Dt)
    {
        // At large angles turn at a comfortable fixed speed, then ease to a stop.
        // Crossing between the two regimes within a frame uses the leftover time.
        return StepYawToward(View, Travel, 175., .22, Dt);
    }

    inline double AutoBehindYaw(double ControlYaw, FVector2D MoveAxis, double CharacterYaw,
        double HorizontalSpeed, double Dt, bool bPendingAlign = false)
    {
        const double NormalizedView = FRotator::NormalizeAxis(ControlYaw);
        if (Dt <= 0.) return NormalizedView;
        const double Lateral = FMath::Clamp(FMath::Abs(MoveAxis.X), 0., 1.);
        // Pure backward walking preserves the camera heading rather than spinning 180 degrees.
        if (Lateral <= LateralInputDeadzone && MoveAxis.Y < -LateralInputDeadzone)
            return NormalizedView;
        if (Lateral > LateralInputDeadzone)
        {
            const double Gap = FRotator::NormalizeAxis(CharacterYaw - NormalizedView);
            if (Gap * MoveAxis.X <= 0.) return NormalizedView;
            const double SpeedScale = FMath::GetMappedRangeValueClamped(
                FVector2D(0., 180.), FVector2D(.35, 1.), FMath::Max(0., HorizontalSpeed));
            return StepYawToward(NormalizedView, CharacterYaw,
                AutoBehindDegreesPerSecond * Lateral * SpeedScale, AutoBehindTimeConstant, Dt);
        }
        if (bPendingAlign)
            return StepYawToward(NormalizedView, CharacterYaw,
                AutoBehindDegreesPerSecond, AutoBehindTimeConstant, Dt);
        return NormalizedView;
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
