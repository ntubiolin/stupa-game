#include "../TibetPlayerFeedback.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetPlayerHitTest, "Tibet.Feedback.PlayerHit",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetPlayerHitTest::RunTest(const FString&)
{
    FTibetPlayerFeedback Feedback;
    TestEqual(TEXT("Fresh game shows no injury"), Feedback.HurtOpacity(0), 0.f);
    Feedback.RecordHit(5.f, 100.f, 84.f);
    TestEqual(TEXT("Displayed loss follows the health meter"), Feedback.Loss, 16);
    TestEqual(TEXT("Hit is immediately legible"), Feedback.HurtOpacity(5.f), 1.f);
    TestTrue(TEXT("Visible character recoil"), Feedback.Flinch(5.12f) > .4f);
    Feedback.RecordHit(5.5f, 84.f, 84.f);
    Feedback.RecordHit(5.6f, 84.f, 88.f);
    TestEqual(TEXT("Shield and recovery do not restart injury"), Feedback.HitTime, 5.f);
    TestEqual(TEXT("Recoil ends"), Feedback.Flinch(5.5f), 0.f);
    TestEqual(TEXT("Injury marker clears"), Feedback.HurtOpacity(6.f), 0.f);
    Feedback.RecordHit(7.f, 3.f, 0.f);
    TestEqual(TEXT("Final hit shows remaining health lost"), Feedback.Loss, 3);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetObjectivePulseTest, "Tibet.Feedback.ObjectivePulse",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetObjectivePulseTest::RunTest(const FString&)
{
    FTibetPlayerFeedback Feedback;
    Feedback.ObjectiveTime = 14.f;
    TestEqual(TEXT("New objective catches the eye"), Feedback.ObjectivePulse(14.f), 1.f);
    TestTrue(TEXT("Pulse dims"), Feedback.ObjectivePulse(14.65f) < .02f);
    TestTrue(TEXT("Pulse brightens"), Feedback.ObjectivePulse(15.3f) > .9f);
    TestEqual(TEXT("Stationary objective settles"), Feedback.ObjectivePulse(17.f), 0.f);
    return true;
}
#endif
