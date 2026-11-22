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
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetFollowTest, "Tibet.Camera.TravelFollow",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetFollowTest::RunTest(const FString&)
{
    for (int32 Frames : {30, 60, 120})
    {
        const double Dt=1./Frames;
        // Cross the signed-yaw seam while returning from a temporary orbit.
        double View=155.;
        for (int32 I=0; I<Frames; ++I) View=FRotator::NormalizeAxis(View+TibetCamera::OrbitDegreesPerSecond*Dt);
        TestTrue(TEXT("Clockwise orbit travels the same angle at 30, 60 and 120 Hz"),
            FMath::IsNearlyEqual(View,-100.,.001));
        const double Start=View, Target=155.;
        for (int32 I=0; I<Frames; ++I)
        {
            const double Next=TibetCamera::FollowYaw(View,Target,Dt);
            const double Change=FRotator::NormalizeAxis(Next-View);
            TestTrue(TEXT("Release takes the shortest path at a bounded speed"),Change<=0. && -Change<=175.*Dt+.05);
            View=Next;
        }
        TestTrue(TEXT("Return is independent of frame partition"),FMath::IsNearlyEqual(View,TibetCamera::FollowYaw(Start,Target,1.),.001));
        TestTrue(TEXT("After a second the view is close to the actual travel direction"),FMath::Abs(FRotator::NormalizeAxis(View-Target))<3.);
    }
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetAutoBehindTest, "Tibet.Camera.AutoBehind",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetAutoBehindTest::RunTest(const FString&)
{
    for (int32 Frames : {30, 60, 120})
    {
        const double Dt = 1. / Frames;

        // Right movement turns the camera smoothly clockwise behind the pilgrim.
        double RightView = 0.;
        for (int32 I = 0; I < Frames; ++I)
        {
            const double Next = TibetCamera::AutoBehindYaw(RightView, FVector2D(1., 0.), 90., 570., Dt);
            const double Step = FRotator::NormalizeAxis(Next - RightView);
            TestTrue(TEXT("Right move turns clockwise at bounded speed"),
                Step >= 0. && Step <= TibetCamera::AutoBehindDegreesPerSecond * Dt + .05);
            RightView = Next;
        }
        TestTrue(TEXT("Right follow is frame-rate independent across 30/60/120 Hz"),
            FMath::IsNearlyEqual(RightView, TibetCamera::AutoBehindYaw(0., FVector2D(1., 0.), 90., 570., 1.), .001));
        TestTrue(TEXT("Right follow approaches character back within a second"),
            RightView > 75. && RightView <= 90.);

        // Left movement turns counter-clockwise cleanly across the +/-180 yaw seam.
        double LeftView = -135.;
        const double LeftTarget = 135.;
        for (int32 I = 0; I < Frames; ++I)
        {
            const double Next = TibetCamera::AutoBehindYaw(LeftView, FVector2D(-1., 0.), LeftTarget, 570., Dt);
            const double Step = FRotator::NormalizeAxis(Next - LeftView);
            TestTrue(TEXT("Left move turns counter-clockwise at bounded speed"),
                Step <= 0. && -Step <= TibetCamera::AutoBehindDegreesPerSecond * Dt + .05);
            LeftView = Next;
        }
        TestTrue(TEXT("Left follow across seam is frame-rate independent"),
            FMath::IsNearlyEqual(LeftView, TibetCamera::AutoBehindYaw(-135., FVector2D(-1., 0.), LeftTarget, 570., 1.), .001));
        TestTrue(TEXT("Left follow approaches character back across seam"),
            FMath::Abs(FRotator::NormalizeAxis(LeftTarget - LeftView)) < 15.);

        // Releasing lateral input with pending align finishes framing directly behind the pilgrim.
        double SettleView = RightView;
        for (int32 I = 0; I < Frames; ++I)
            SettleView = TibetCamera::AutoBehindYaw(SettleView, FVector2D::ZeroVector, 90., 0., Dt, true);
        TestTrue(TEXT("Post-lateral settle finishes framing behind character"),
            FMath::Abs(FRotator::NormalizeAxis(90. - SettleView)) < .5);

        // Pure backward walking and idle states keep camera heading steady with zero drift.
        double BackView = 35.;
        double IdleView = 35.;
        for (int32 I = 0; I < Frames; ++I)
        {
            BackView = TibetCamera::AutoBehindYaw(BackView, FVector2D(0., -1.), -145., 570., Dt, true);
            IdleView = TibetCamera::AutoBehindYaw(IdleView, FVector2D::ZeroVector, 125., 0., Dt, false);
        }
        TestEqual(TEXT("Pure S backward keeps camera heading steady"), BackView, 35.);
        TestEqual(TEXT("Idle without pending align has zero camera drift"), IdleView, 35.);
        TestEqual(TEXT("Direction reversal waits until body crosses to new side"),
            TibetCamera::AutoBehindYaw(0., FVector2D(-1., 0.), 45., 300., Dt, true), 0.);
    }
    return true;
}
#endif
