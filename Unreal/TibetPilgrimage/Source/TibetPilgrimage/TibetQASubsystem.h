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
private:
    void Finish(bool bSuccess, const FString& Detail);
    void Photo(APlayerController& PC);
    void Arrival(APlayerController& PC);
    void Play(APlayerController& PC, ATibetGameMode& Mode);
    void LearnedSkills(APlayerController& PC, ATibetGameMode& Mode);
    void SkillEncounter(APlayerController& PC, ATibetGameMode& Mode);
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
    int32 Frames = 0, PreviousStep = INDEX_NONE, PreviousProgress = INDEX_NONE;
    bool bFinished = false, bMoving = false, bTestingSkills = false;
    FKey Tapped;
    TArray<FVector> Waypoints;
    FVector LastNavPosition = FVector::ZeroVector;
    double LastNavCheck = 0;
};
