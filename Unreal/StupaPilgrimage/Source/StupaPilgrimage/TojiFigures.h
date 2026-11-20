#pragma once

#include "CoreMinimal.h"

class AActor;
class USceneComponent;
class UStaticMeshComponent;

namespace TojiFigures
{
    UStaticMeshComponent* Part(AActor& Owner, USceneComponent& Parent, const TCHAR* Shape,
        const FVector& Position, const FVector& Size, const FLinearColor& Color,
        const FRotator& Rotation = FRotator::ZeroRotator);
    void Person(AActor& Owner, USceneComponent& Parent, bool bPilgrim,
        TArray<USceneComponent*>* Limbs = nullptr);
}
