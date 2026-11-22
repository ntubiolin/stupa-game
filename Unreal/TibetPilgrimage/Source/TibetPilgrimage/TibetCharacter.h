#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "TibetCharacter.generated.h"

struct TIBETPILGRIMAGE_API FTibetLimbPose
{
    float LeftHipPitch = 0.f, RightHipPitch = 0.f;
    float LeftKneePitch = 0.f, RightKneePitch = 0.f;
    float LeftArmPitch = 0.f, RightArmPitch = 0.f;
    float TorsoPitch = 0.f, FigureZOffset = 0.f;
};

UCLASS()
class TIBETPILGRIMAGE_API ATibetCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    ATibetCharacter();
    static FTibetLimbPose ComputeLimbPose(
        float WalkPhase, float GroundSpeed, bool bFalling, float VerticalVelocity, float LandAlpha);
    virtual void SetPlayerDefaults() override;
    virtual FRotator GetViewRotation() const override;
    virtual void Tick(float DeltaSeconds) override;
    virtual void Landed(const FHitResult& Hit) override;
    void CancelGameplayInput();
    void RespawnAtStart();
    FVector GetStartLocation() const { return Start; }
    FRotator GetStartRotation() const { return StartRotation; }
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
protected:
    virtual void BeginPlay() override;
private:
    static constexpr float LandCushionDuration = 0.18f;
    UPROPERTY() TObjectPtr<USceneComponent> Figure;
    UPROPERTY() TObjectPtr<USceneComponent> LeftLegJoint;
    UPROPERTY() TObjectPtr<USceneComponent> RightLegJoint;
    UPROPERTY() TObjectPtr<USceneComponent> LeftCalfJoint;
    UPROPERTY() TObjectPtr<USceneComponent> RightCalfJoint;
    UPROPERTY() TObjectPtr<USceneComponent> LeftSleeveJoint;
    UPROPERTY() TObjectPtr<USceneComponent> RightSleeveJoint;
    FVector Start = FVector(-2000.f, 0.f, 100.f);
    FRotator StartRotation = FRotator::ZeroRotator;
    float WalkPhase = 0.f;
    float LandTimer = 0.f;
    FTibetLimbPose CurrentPose;
    FVector2D Thumb, Drag;
    int32 MoveFinger = -1, LookFinger = -1;
    bool bAwaitingDragMotion = true;
    double ViewYawOffset = 0.;
    double InteractPressedAt = -1.;
    void UpdateOrbit(APlayerController& Player, float Dt);
    void PressInteract();
    void ReleaseInteract();
    void UpdateMouseLook(APlayerController& Player);
    void TurnView(APlayerController& Player, FVector2D Degrees);
    void TouchDown(ETouchIndex::Type Index, FVector Position);
    void TouchUp(ETouchIndex::Type Index, FVector Position);
    void FeedMonkey();
    void DoInteract();
    void DoCast(int32 Skill);
    void Language();
    void OpenMap();
    void OpenPack();
    void UseQuickSlot();
    void OpenSkills();
    void ToggleMenu();
    void TryJump();
    bool JournalOpen() const;
};
