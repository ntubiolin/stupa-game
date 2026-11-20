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
    virtual void Tick(float DeltaSeconds) override;
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
    void UpdateMouseLook(APlayerController& Player);
    void TouchDown(ETouchIndex::Type Index, FVector Position);
    void TouchUp(ETouchIndex::Type Index, FVector Position);
    void DoInteract();
    void DoCast(int32 Skill);
    void Language();
    void Quit();
};
