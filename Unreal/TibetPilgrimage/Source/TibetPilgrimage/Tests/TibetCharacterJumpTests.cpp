#include "../TibetCharacter.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetCharacterJumpKneeFlexTest, "Tibet.Character.JumpKneeFlex",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetCharacterJumpKneeFlexTest::RunTest(const FString&)
{
    // 1. Standing idle rests cleanly at zero with straight knees and level figure.
    const FTibetLimbPose Idle = ATibetCharacter::ComputeLimbPose(0.f, 0.f, false, 0.f, 0.f);
    TestNearlyEqual(TEXT("Idle left hip rests at zero"), Idle.LeftHipPitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle right hip rests at zero"), Idle.RightHipPitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle left knee rests at zero"), Idle.LeftKneePitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle right knee rests at zero"), Idle.RightKneePitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle left sleeve rests at zero"), Idle.LeftArmPitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle right sleeve rests at zero"), Idle.RightArmPitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle torso rests at zero"), Idle.TorsoPitch, 0.f, 1e-4f);
    TestNearlyEqual(TEXT("Idle figure height offset rests at zero"), Idle.FigureZOffset, 0.f, 1e-4f);

    // 2. Jump ascent (Vz = 420 cm/s): verify UE FRotationMatrix kinematics & anatomical knee flexion.
    const FTibetLimbPose Ascent = ATibetCharacter::ComputeLimbPose(0.f, 350.f, true, 420.f, 0.f);
    TestTrue(TEXT("Ascent tucks lead hip high forward"), Ascent.LeftHipPitch > 40.f);
    TestTrue(TEXT("Ascent tucks trail hip forward"), Ascent.RightHipPitch > 20.f);
    TestTrue(TEXT("Ascent flexes lead knee deeply backward"), Ascent.LeftKneePitch < -60.f);
    TestTrue(TEXT("Ascent flexes trail knee backward"), Ascent.RightKneePitch < -45.f);
    TestTrue(TEXT("Ascent lifts both sleeves"), Ascent.LeftArmPitch > 20.f && Ascent.RightArmPitch > 20.f);
    TestTrue(TEXT("Ascent leans torso forward"), Ascent.TorsoPitch < -5.f);

    const FVector KneeInFigure = FRotationMatrix(FRotator(Ascent.LeftHipPitch, 0.f, 0.f))
        .TransformVector(FVector(0.f, 0.f, -37.f));
    TestTrue(TEXT("Positive hip pitch swings thigh knee-end forward (+X) and upward"),
        KneeInFigure.X > 20.f && KneeInFigure.Z > -30.f);

    const FVector AnkleInKneeLocal = FRotationMatrix(FRotator(Ascent.LeftKneePitch, 0.f, 0.f))
        .TransformVector(FVector(0.f, 0.f, -45.f));
    TestTrue(TEXT("Negative knee pitch folds shin/boot backward (-X) relative to thigh, never hyperextending"),
        AnkleInKneeLocal.X < -30.f);

    const FVector HeadForward = FRotationMatrix(FRotator(Ascent.TorsoPitch, 0.f, 0.f))
        .TransformVector(FVector(0.f, 0.f, 100.f));
    TestTrue(TEXT("Negative torso pitch leans pilgrim upper body forward (+X)"), HeadForward.X > 8.f);

    // 3. Jump apex (Vz = 0 cm/s): suspended mid-air leap keeps both knees clearly flexed.
    const FTibetLimbPose Apex = ATibetCharacter::ComputeLimbPose(0.f, 350.f, true, 0.f, 0.f);
    TestTrue(TEXT("Apex keeps lead knee clearly bent"), Apex.LeftKneePitch < -45.f);
    TestTrue(TEXT("Apex keeps trail knee clearly bent"), Apex.RightKneePitch < -38.f);
    TestTrue(TEXT("Apex never hyperextends knees"), Apex.LeftKneePitch < 0.f && Apex.RightKneePitch < 0.f);

    // 4. Jump descent (Vz = -320 cm/s): lead leg extends toward ground while both knees stay flexed to absorb landing.
    const FTibetLimbPose Descent = ATibetCharacter::ComputeLimbPose(0.f, 350.f, true, -320.f, 0.f);
    TestTrue(TEXT("Descent extends lead leg compared to ascent"),
        Descent.LeftHipPitch < Ascent.LeftHipPitch && Descent.LeftKneePitch > Ascent.LeftKneePitch);
    TestTrue(TEXT("Descent still keeps lead knee bent backward"), Descent.LeftKneePitch <= -25.f);
    TestTrue(TEXT("Descent keeps trail knee bent backward"), Descent.RightKneePitch <= -38.f);

    // 5. Landing cushion squat (LandAlpha = 0.5 -> peak sin(0.5 * PI) = 1).
    const FTibetLimbPose Landing = ATibetCharacter::ComputeLimbPose(0.f, 0.f, false, 0.f, 0.5f);
    TestTrue(TEXT("Landing cushion lowers figure into squat"), Landing.FigureZOffset < -7.f);
    TestTrue(TEXT("Landing cushion pitches both thighs forward"),
        Landing.LeftHipPitch > 18.f && Landing.RightHipPitch > 18.f);
    TestTrue(TEXT("Landing cushion bends both knees backward"),
        Landing.LeftKneePitch < -35.f && Landing.RightKneePitch < -35.f);
    TestTrue(TEXT("Landing cushion leans torso forward"), Landing.TorsoPitch < -4.f);

    // 6. Full running stride cycle: knees flex backward during swing and never hyperextend forward.
    float MinLeftKnee = 0.f, MinRightKnee = 0.f;
    for (int32 Step = 0; Step < 32; ++Step)
    {
        const float Phase = (Step / 32.f) * 2.f * UE_PI;
        const FTibetLimbPose Stride = ATibetCharacter::ComputeLimbPose(Phase, 520.f, false, 0.f, 0.f);
        TestTrue(TEXT("Running left knee never hyperextends forward"), Stride.LeftKneePitch <= 0.f);
        TestTrue(TEXT("Running right knee never hyperextends forward"), Stride.RightKneePitch <= 0.f);
        MinLeftKnee = FMath::Min(MinLeftKnee, Stride.LeftKneePitch);
        MinRightKnee = FMath::Min(MinRightKnee, Stride.RightKneePitch);
    }
    TestTrue(TEXT("Running stride reaches clear left knee flexion"), MinLeftKnee < -25.f);
    TestTrue(TEXT("Running stride reaches clear right knee flexion"), MinRightKnee < -25.f);

    return true;
}
#endif
