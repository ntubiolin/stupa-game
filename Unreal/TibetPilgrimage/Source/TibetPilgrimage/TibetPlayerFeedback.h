#pragma once

#include "CoreMinimal.h"

// Presentation follows game time so opening the journal pauses the cues.
struct FTibetPlayerFeedback
{
    float HitTime = -10.f;
    float ObjectiveTime = -10.f;
    int32 Loss = 0;

    void RecordHit(float Now, float Before, float After)
    {
        if (Before <= After) return;
        Loss = FMath::CeilToInt(Before) - FMath::CeilToInt(After);
        HitTime = Now;
    }

    float HurtOpacity(float Now) const
    {
        const float Age = Now - HitTime;
        return Loss > 0 && Age >= 0.f ? 1.f - FMath::SmoothStep(.28f, .95f, Age) : 0.f;
    }

    float Flinch(float Now) const
    {
        const float Phase = FMath::Clamp((Now - HitTime) / .42f, 0.f, 1.f);
        return Loss > 0 && Phase < 1.f ? FMath::Sin(PI * Phase) * (1.f - Phase) : 0.f;
    }

    float ObjectivePulse(float Now) const
    {
        const float Age = Now - ObjectiveTime;
        if (Age < 0.f || Age >= 2.6f) return 0.f;
        const float Wave = .5f + .5f * FMath::Cos(2.f * PI * Age / 1.3f);
        return Wave * (1.f - FMath::SmoothStep(1.65f, 2.6f, Age));
    }
};
