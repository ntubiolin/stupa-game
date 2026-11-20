#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "TibetCharacter.generated.h"

UCLASS()
class TIBETPILGRIMAGE_API ATibetCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    ATibetCharacter();
    virtual void SetPlayerDefaults() override;
    virtual FRotator GetViewRotation() const override;
    virtual void Tick(float DeltaSeconds) override;
    void CancelGameplayInput();
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
protected:
    virtual void BeginPlay() override;
private:
    UPROPERTY() TObjectPtr<USceneComponent> Figure;
    UPROPERTY() TArray<USceneComponent*> Joints;
    FVector Start;
    float WalkPhase = 0;
    FVector2D Thumb, Drag;
    int32 MoveFinger = -1, LookFinger = -1;
    bool bAwaitingDragMotion = true;
    double ViewYawOffset = 0.;
    double InteractPressedAt = -1.;
    double ManualLookGrace = 0.;
    bool bReturningFromOrbit = false;
    bool bFollowingTravel = false;
    bool bHadMoveInput = false;
    double LastTravelYaw = 0.;
    void UpdateFollowView(APlayerController& Player, bool bMoveInput, float Dt);
    void PressInteract();
    void ReleaseInteract();
    void UpdateMouseLook(APlayerController& Player);
    void TurnView(APlayerController& Player, FVector2D Degrees);
    void TouchDown(ETouchIndex::Type Index, FVector Position);
    void TouchUp(ETouchIndex::Type Index, FVector Position);
    void DoInteract();
    void DoCast(int32 Skill);
    void Language();
    void OpenMap();
    void OpenSkills();
    void ToggleMenu();
    void TryJump();
    bool JournalOpen() const;
};
