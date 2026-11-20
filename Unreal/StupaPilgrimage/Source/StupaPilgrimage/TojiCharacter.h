#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "TojiCharacter.generated.h"

class UStaticMeshComponent;

UCLASS()
class STUPAPILGRIMAGE_API ATojiCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ATojiCharacter();
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> Figure;

    UPROPERTY()
    TArray<UStaticMeshComponent*> Limbs;

    FVector Trailhead;
    float WalkTime = 0;
    void Interact();
    void Cast();
    void ChangeLanguage();
    void ShowImportFolder();
    void Import();
    void Day();
    void Dusk();
    void Night();
    void Quit();
};
