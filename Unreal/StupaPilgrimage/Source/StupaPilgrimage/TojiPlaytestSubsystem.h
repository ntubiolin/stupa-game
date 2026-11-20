#pragma once

#include "CoreMinimal.h"
#include "InputCoreTypes.h"
#include "Subsystems/WorldSubsystem.h"
#include "TojiPlaytestSubsystem.generated.h"

class APlayerController;
class ATojiGameMode;

UCLASS()
class UTojiPlaytestSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;

private:
    bool Begin(ATojiGameMode& Mode, double Now);
    void Finish(APlayerController& Controller, const FString& Error);
    void SetKey(APlayerController& Controller, const FKey& Key, bool bDown, float Amount = 1);
    bool Walk(APlayerController& Controller, const FVector& Target);
    void Checkpoint(const TCHAR* Name, const APlayerController& Controller, double Now);

    FString Directory;
    FString PendingImage;
    TArray<FString> Checkpoints;
    TArray<FString> VideoFrames;
    TArray<double> FrameIntervals;
    FIntPoint ViewportSize = FIntPoint::ZeroValue;
    double StartAt = 0;
    double LastFrameAt = 0;
    double StepStartedAt = 0;
    double ReleasedAt = 0;
    double Duration = 0;
    double NextVideoAt = 0;
    double StartZ = 0;
    double HighestZ = 0;
    int32 WarmupFrames = 0;
    int32 StepIndex = 0;
    int32 LoopIndex = 0;
    FKey HeldKey;
    bool bResume = false;
    bool bRecord = false;
    bool bFinished = false;
};
