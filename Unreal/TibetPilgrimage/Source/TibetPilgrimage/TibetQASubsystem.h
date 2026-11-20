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
    virtual bool IsTickableWhenPaused() const override { return Task==TEXT("Journal") || Task==TEXT("CameraFollow"); }
private:
    void Finish(bool bSuccess, const FString& Detail);
    void Journal(APlayerController& PC, ATibetGameMode& Mode);
    void Photo(APlayerController& PC);
    void Arrival(APlayerController& PC);
    void CameraFollow(APlayerController& PC, ATibetGameMode& Mode);
    bool SurveyGate(APlayerController& PC, const FVector& Goal);
    int32 GateFrames = 0;
    uint8 GatePhases = 0;
    void Play(APlayerController& PC, ATibetGameMode& Mode);
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
    float GuardedContact = -1.f;
    int32 Frames = 0, PreviousStep = INDEX_NONE, PreviousProgress = INDEX_NONE;
    bool bFinished = false, bMoving = false, bTestingSkills = false;
    FKey Tapped;
    TArray<FVector> Waypoints;
    FVector LastNavPosition = FVector::ZeroVector;
    double LastNavCheck = 0;
};
