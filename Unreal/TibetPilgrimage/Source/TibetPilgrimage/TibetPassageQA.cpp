#include "TibetQASubsystem.h"
#include "TibetTravelGate.h"
#include "Engine/GameViewportClient.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "InputKeyEventArgs.h"
#include "GameFramework/PlayerController.h"
#include "UnrealClient.h"

// Hold the gameplay camera on the real, unlocked threshold long enough to
// record both ends of its pulse before continuing with normal movement input.
bool UTibetQASubsystem::SurveyGate(APlayerController& PC, const FVector& Goal)
{
    if (GatePhases == 3 || FVector::Dist2D(PC.GetPawn()->GetActorLocation(), Goal) < 850) return false;
    for (TActorIterator<ATibetTravelGate> It(GetWorld()); It; ++It)
    {
        if (!It->GetActorLocation().Equals(Goal, 2)) continue;
        if (bMoving)
        {
            auto Release = FInputKeyEventArgs::CreateSimulated(EKeys::W, IE_Released, 0);
            PC.InputKey(Release);
            bMoving = false;
        }
        const FVector ToGate = Goal - PC.GetPawn()->GetActorLocation();
        PC.SetControlRotation(FRotator(0, ToGate.Rotation().Yaw, 0));
        if (++GateFrames < 26 || FScreenshotRequest::IsScreenshotRequested()) return true;
        const float Glow = It->Glow();
        const uint8 Phase = Glow <= .76f ? 1 : (Glow >= 1.24f ? 2 : 0);
        if (Phase && !(Phase & GatePhases))
        {
            FVector2D Pixel;
            if (!PC.ProjectWorldLocationToScreen(Goal + FVector(0, 105, 153), Pixel))
            { Finish(false, TEXT("Gate outside gameplay view")); return true; }
            const FString Name = Phase == 1 ? TEXT("gate-low") : TEXT("gate-high");
            Record(FString::Printf(TEXT("glow\t%s\t%.2f\t%.1f\t%.1f\t%.1f"),
                *Name, Glow, ToGate.Size2D(), Pixel.X, Pixel.Y));
            FScreenshotRequest::RequestScreenshot(Output / (Name + TEXT(".png")), false, false, false);
            GatePhases |= Phase;
        }
        return true;
    }
    Finish(false, TEXT("No travel beacon at the active passage"));
    return true;
}
