#pragma once

#include "Subsystems/WorldSubsystem.h"
#include "TojiPhotoSubsystem.generated.h"

class ACameraActor;

// Development builds opt in with -TojiPhotoDir to photograph the packaged game.
UCLASS()
class UTojiPhotoSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
    virtual void Tick(float DeltaSeconds) override;
    virtual TStatId GetStatId() const override;

private:
    void Fail(const FString& Reason);
    void SaveMeasurement();

    UPROPERTY() TObjectPtr<ACameraActor> Camera;
    FString ImagePath;
    FString MetadataPath;
    TArray<double> IntervalsMs;
    int32 WarmupFrames = 0;
    double LastTime = 0;
    double ScreenshotRequestedAt = 0;
    bool bFinished = false;
};
