#include "../TibetCameraMotion.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetLookTest, "Tibet.Camera.Look",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetLookTest::RunTest(const FString&)
{
    for (int32 Frames : {30, 60, 120})
    {
        FRotator View = FRotator::ZeroRotator;
        for (int32 i = 0; i < Frames; ++i)
        {
            // A single 900-count right, 160-count upward drag split across one second.
            View = TibetCamera::Turn(View, TibetCamera::MouseDegrees(FVector2D(900., 160.) / Frames), 1.f, false);
        }
        TestTrue(TEXT("Same drag ends facing right and up at every frame rate"),
            View.Equals(FRotator(13.6, 90., 0.), .001));
    }
    const FVector2D Mouse = TibetCamera::MouseDegrees(FVector2D(100., 100.));
    TestTrue(TEXT("Inversion affects pitch alone, sensitivity scales both axes"),
        TibetCamera::Turn(FRotator::ZeroRotator, Mouse, .5f, true).Equals(FRotator(-4.25, 5., 0.), .001));
    TestEqual(TEXT("Can inspect the spire from the base"), TibetCamera::Turn(
        FRotator::ZeroRotator, FVector2D(0., 95.), 1.f, false).Pitch, 72.);
    TestEqual(TEXT("Looking high keeps boom and lens pitch independent"), TibetCamera::BoomPitch(72.), 9.);
    TestEqual(TEXT("Downward orbit still responds to look"), TibetCamera::BoomPitch(320.), -40.);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetWallTest, "Tibet.Camera.WallClearance",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetWallTest::RunTest(const FString&)
{
    for (int32 Frames : {30, 60, 120})
    {
        double Length = TibetCamera::ClearArmFraction(1., .25, 1.f / Frames);
        TestEqual(TEXT("Wall shortens arm immediately"), Length, .25);
        for (int32 i = 0; i < Frames / 2; ++i)
            Length = TibetCamera::ClearArmFraction(Length, 1., 1.f / Frames);
        TestTrue(TEXT("Half-second recovery matches across frame rates without overshooting"),
            FMath::IsNearlyEqual(Length, 1. - .75 * FMath::Exp(-.5 / .16), .001));
        TestEqual(TEXT("Second wall interrupts recovery immediately"),
            TibetCamera::ClearArmFraction(Length, .1, 1.f / Frames), .1);
    }
    return true;
}
#endif
