#include "TibetCameraBoom.h"
#include "TibetCameraMotion.h"
#include "GameFramework/Pawn.h"

FRotator UTibetCameraBoom::GetDesiredRotation() const
{
    const APawn* Pawn = Cast<APawn>(GetOwner());
    if (!Pawn) return Super::GetDesiredRotation();
    FRotator View = Pawn->GetViewRotation();
    View.Pitch = TibetCamera::BoomPitch(View.Pitch);
    return View;
}

FVector UTibetCameraBoom::BlendLocations(const FVector& Desired, const FVector& Hit, bool bBlocked,
    float DeltaSeconds)
{
    const FVector Pivot = GetComponentLocation() + TargetOffset;
    const FVector Arm = Desired - Pivot;
    const double LengthSq = Arm.SizeSquared();
    if (LengthSq < UE_SMALL_NUMBER) return Pivot;
    // Stay on the ray that the stock spring arm actually swept, including its shoulder offset.
    const double SafeLimit = bBlocked ? FMath::Clamp(FVector::DotProduct(Hit - Pivot, Arm) / LengthSq, 0.0, 1.0) : 1.0;
    ArmFraction = TibetCamera::ClearArmFraction(ArmFraction, SafeLimit, DeltaSeconds);
    return ArmFraction == 1.0 ? Desired : Pivot + Arm * ArmFraction;
}
