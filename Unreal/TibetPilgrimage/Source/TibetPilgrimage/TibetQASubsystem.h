#pragma once

#include "Subsystems/WorldSubsystem.h"
#include "InputCoreTypes.h"
#include "TibetQASubsystem.generated.h"

class ACameraActor;
class APlayerController;
class ATibetGameMode;

// Development builds opt in using -TibetQA=Photo, Play or Resume.
UCLASS()
class UTibetQASubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()
public:
    virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
    virtual TStatId GetStatId() const override;
    virtual void Tick(float DeltaSeconds) override;
    virtual bool IsTickableWhenPaused() const override { return Task==TEXT("Courtyard") || Task==TEXT("Dialogue") || Task==TEXT("Journal") || Task==TEXT("AtlasTravel") || Task==TEXT("CameraFollow") || Task.StartsWith(TEXT("Pack")); }
private:
    void Finish(bool bSuccess, const FString& Detail);
    void DialogueTest(APlayerController& PC, ATibetGameMode& Mode);
    int32 DialoguePhase = 0;
    void PackJourney(APlayerController& PC, ATibetGameMode& Mode);
    void Journal(APlayerController& PC, ATibetGameMode& Mode);
    void AtlasTravel(APlayerController& PC, ATibetGameMode& Mode);
    void Photo(APlayerController& PC);
    void Arrival(APlayerController& PC);
    void Courtyard(APlayerController& PC, ATibetGameMode& Mode);
    FName HoveredCourtyardControl;
    bool TapPlayControl(FName Tag, float XFraction=.5f);
    bool CheckPracticeShortcut(FName Tag, const FString& ExpectedLabel);
    bool bCapturedPracticeHUD=false;
    int32 CourtyardStep=0;
    float CheckedPhase=0, CheckedFlame=0, ClockStarted=0;
    double CourtyardSince=0;
    void CameraFollow(APlayerController& PC, ATibetGameMode& Mode);
    bool SurveyGate(APlayerController& PC, const FVector& Goal);
    bool SawEnemyWindup = false, SawEnemyStrike = false;
    void ObserveEnemyAttack();
    bool CaptureEncounter(APlayerController& PC, ATibetGameMode& Mode);
    TSet<FName> SeenEncounters;
    int32 GateFrames = 0;
    uint8 GatePhases = 0;
    void Play(APlayerController& PC, ATibetGameMode& Mode);
    void ScoreMix(ATibetGameMode& Mode);
    void LearnedSkills(APlayerController& PC, ATibetGameMode& Mode);
    void SkillEncounter(APlayerController& PC, ATibetGameMode& Mode);
    void PlayerFeedback(APlayerController& PC, ATibetGameMode& Mode);
    void Record(const FString& Line) const;
    bool FindWalkingPath(APawn& Pawn, const FVector& Goal, double Reach);

    UPROPERTY() TObjectPtr<ACameraActor> Camera;
    FString Output, Task, StartMap, Screenshot;
    TArray<double> FrameMs;
    FRotator HeadingBeforeDrag;
    FRotator HeadingAfterDrag;
    FVector ArrivalPosition;
    double Began = 0, LastFrame = 0, LastAction = 0;
    int32 SkillPhase = 0, SkillHealthBefore = 0;
    float SkillGameTime = 0;
    int32 FeedbackPhase = 0;
    float GuardedContact = -1.f, AttackTestTime = 0.f;
    int32 Frames = 0, PreviousStep = INDEX_NONE, PreviousProgress = INDEX_NONE;
    bool bFinished = false, bMoving = false, bTestingSkills = false;
    FKey Tapped;
    TArray<FVector> Waypoints;
    FVector LastNavPosition = FVector::ZeroVector;
    double LastNavCheck = 0;
};
