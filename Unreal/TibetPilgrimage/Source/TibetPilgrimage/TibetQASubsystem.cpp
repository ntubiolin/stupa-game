#include "TibetQASubsystem.h"
#include "TibetGameMode.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Engine/Engine.h"
#include "CollisionQueryParams.h"
#include "CollisionShape.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformTime.h"
#include "InputKeyEventArgs.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "UnrealClient.h"

bool UTibetQASubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
#if UE_BUILD_SHIPPING
    return false;
#else
    const UWorld* World = Cast<UWorld>(Outer);
    FString TaskName, Path;
    return World && World->WorldType == EWorldType::Game &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQA="), TaskName) &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAOutput="), Path) && !FPaths::IsRelative(Path);
#endif
}

TStatId UTibetQASubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTibetQASubsystem, STATGROUP_Tickables);
}

void UTibetQASubsystem::Record(const FString& Line) const
{
    const FString File = Output / TEXT("events.tsv");
    FFileHelper::SaveStringToFile(Line + LINE_TERMINATOR, *File, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM,
        &IFileManager::Get(), FILEWRITE_Append);
}

void UTibetQASubsystem::Finish(bool bSuccess, const FString& Detail)
{
    bFinished = true;
    Record(FString::Printf(TEXT("%s\t%s"), bSuccess ? TEXT("pass") : TEXT("fail"), *Detail));
    FPlatformMisc::RequestExitWithStatus(false, bSuccess ? 0 : 1, TEXT("TibetQA"));
}

void UTibetQASubsystem::Tick(float)
{
    if (bFinished) return;
    UWorld* World = GetWorld();
    APlayerController* PC = World->GetFirstPlayerController();
    auto* Mode = World->GetAuthGameMode<ATibetGameMode>();
    if (!PC || !PC->GetPawn() || !PC->PlayerCameraManager || !Mode ||
        !GEngine || !GEngine->GameViewport || !GEngine->GameViewport->Viewport) return;
    if (Task.IsEmpty())
    {
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQA="), Task);
        FParse::Value(Args, TEXT("TibetQAOutput="), Output);
        FParse::Value(Args, TEXT("TibetQAStart="), StartMap);
        Began = FPlatformTime::Seconds();
    }
    if ((Task == TEXT("Play") || Task == TEXT("GroveEntry")) && World->GetMapName() != StartMap)
    {
        Finish(true, TEXT("transition\t") + World->GetMapName());
        return;
    }
    if (Task != TEXT("Campaign") && World->GetMapName() != StartMap) { Finish(false, TEXT("Unexpected map: ") + World->GetMapName()); return; }
    if (Task == TEXT("Photo")) Photo(*PC);
    else if (Task == TEXT("Play") || Task == TEXT("Campaign") || Task == TEXT("GroveEntry") || Task == TEXT("Skills")) Play(*PC, *Mode);
    else if (Task == TEXT("Resume"))
    {
        int32 Expected = INDEX_NONE;
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAExpected="), Expected);
        Finish(Mode->GetStep() == Expected, FString::Printf(TEXT("resumedStep\t%d"),Mode->GetStep()));
    }
    else Finish(false, TEXT("Unknown task ") + Task);
}

void UTibetQASubsystem::Photo(APlayerController& PC)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 100) { Finish(false, TEXT("Photo timeout")); return; }
    if (!Camera)
    {
        FString EyeString, AtString;
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQAEye="), EyeString, false);
        FParse::Value(Args, TEXT("TibetQALook="), AtString, false);
        FVector Eye, At;
        if (!Eye.InitFromString(EyeString) || !At.InitFromString(AtString) || Eye.Equals(At))
        { Finish(false, TEXT("Invalid photograph camera")); return; }
        Camera = GetWorld()->SpawnActor<ACameraActor>(Eye,(At-Eye).Rotation());
        if (!Camera) { Finish(false, TEXT("Photo camera creation failed")); return; }
        const FIntPoint Size = GEngine->GameViewport->Viewport->GetSizeXY();
        const double Aspect = double(Size.X) / FMath::Max(1,Size.Y);
        auto* Lens = Camera->GetCameraComponent();
        Lens->bConstrainAspectRatio = false;
        Lens->bOverrideAspectRatioAxisConstraint = true;
        Lens->AspectRatioAxisConstraint = EAspectRatioAxisConstraint::AspectRatio_MaintainXFOV;
        Lens->SetFieldOfView(FMath::RadiansToDegrees(2.0 * FMath::Atan(Aspect * FMath::Tan(FMath::DegreesToRadians(27.5)))));
        PC.SetViewTarget(Camera);
        PC.GetPawn()->SetActorHiddenInGame(true);
        if (auto* HUD = PC.GetHUD()) HUD->bShowHUD = false;
        Record(FString::Printf(TEXT("view\t%s\t%s\t%s\t%d\t%d\t%s"),
            *StartMap,*Eye.ToCompactString(),*At.ToCompactString(),Size.X,Size.Y,*FPlatformMisc::GetPrimaryGPUBrand()));
        return;
    }
    if (PC.GetViewTarget() != Camera || !PC.PlayerCameraManager->GetCameraLocation().Equals(Camera->GetActorLocation(),1)) return;
    if (++Frames > 45 && Screenshot.IsEmpty()) FrameMs.Add((Now-LastFrame)*1000);
    LastFrame = Now;
    if (!Screenshot.IsEmpty())
    {
        if (!FScreenshotRequest::IsScreenshotRequested() && IFileManager::Get().FileSize(*Screenshot)>0)
            Finish(true, TEXT("photo"));
        return;
    }
    if (FrameMs.Num() == 60)
    {
        FrameMs.Sort();
        Record(FString::Printf(TEXT("frames\t60\t%.2f\t%.2f"),FrameMs[29],FrameMs[56]));
        Screenshot = Output / TEXT("capture.png");
        FScreenshotRequest::RequestScreenshot(Screenshot,false,false,false);
    }
}

namespace
{
void SendKey(APlayerController& PC, FKey Key, bool bDown)
{
    auto Input = FInputKeyEventArgs::CreateSimulated(Key, bDown ? IE_Pressed : IE_Released, bDown ? 1 : 0);
    PC.InputKey(Input);
}
}

// Search a local walkable grid only after the direct keyboard approach stalls. The
// pawn still moves through normal character collision between every waypoint.
bool UTibetQASubsystem::FindWalkingPath(APawn& Pawn, const FVector& Goal, double Reach)
{
    UWorld* World = GetWorld();
    const FVector Start = Pawn.GetActorLocation();
    const FCollisionQueryParams Query(SCENE_QUERY_STAT(TibetQAWalk),false,&Pawn);
    const FCollisionShape Body = FCollisionShape::MakeCapsule(38,65);
    const FIntPoint Directions[] = {{1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1}};
    const double Spacing = 88;
    const FVector2D Limit(FMath::Abs(Goal.X-Start.X)/Spacing+15,FMath::Abs(Goal.Y-Start.Y)/Spacing+15);
    TMap<FIntPoint,FIntPoint> Parent;
    TMap<FIntPoint,FVector> Points;
    TArray<FIntPoint> Queue = {FIntPoint::ZeroValue};
    Points.Add(Queue[0],Start);
    for (int32 I=0; I<Queue.Num() && I<9000; ++I)
    {
        const FIntPoint Key=Queue[I];
        const FVector From=Points[Key];
        if (FVector::Dist2D(From,Goal)<Reach)
        {
            for (FIntPoint At=Key; At!=FIntPoint::ZeroValue; At=Parent[At]) Waypoints.Add(Points[At]);
            return !Waypoints.IsEmpty();
        }
        for (FIntPoint Direction : Directions)
        {
            const FIntPoint Next=Key+Direction;
            if (FMath::Abs(Next.X)>Limit.X || FMath::Abs(Next.Y)>Limit.Y || Points.Contains(Next)) continue;
            FVector To(Start.X+Next.X*Spacing,Start.Y+Next.Y*Spacing,From.Z);
            FHitResult Floor;
            if (!World->LineTraceSingleByChannel(Floor,To+FVector(0,0,25),To-FVector(0,0,220),ECC_Visibility,Query)
                || Floor.ImpactNormal.Z<0.66) continue;
            To.Z=Floor.ImpactPoint.Z+89;
            if (FMath::Abs(To.Z-From.Z)>46) continue;
            if (World->SweepTestByChannel(From,To,FQuat::Identity,ECC_Pawn,Body,Query)) continue;
            Parent.Add(Next,Key); Points.Add(Next,To); Queue.Add(Next);
        }
    }
    return false;
}

void UTibetQASubsystem::Play(APlayerController& PC, ATibetGameMode& Mode)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 240) { Finish(false, TEXT("Play timeout")); return; }
    if (Now - Began < 2.0) return;
    if (Tapped.IsValid()) { SendKey(PC,Tapped,false); Tapped = FKey(); }
    const int32 Step = Mode.GetStep(), Progress = Mode.GetStepProgress();
    const FName Kind = Mode.GetObjectiveKind();
    const FVector Pos = PC.GetPawn()->GetActorLocation();
    const FVector Goal = Task == TEXT("GroveEntry") ? FVector(-1860,-480,0) : Mode.GetObjectiveLocation();
    if (Step != PreviousStep || Progress != PreviousProgress)
    {
        Record(FString::Printf(TEXT("step\t%s\t%d\t%d\t%s\t%s\t%s"),*GetWorld()->GetMapName(),Step,Progress,*Kind.ToString(),
            *Pos.ToCompactString(),*Goal.ToCompactString()));
        if (Step != PreviousStep)
            {
            FString File = Output / FString::Printf(TEXT("%s-%03d.png"),*GetWorld()->GetMapName(),Step);
            if (FPaths::FileExists(File))
                File = Output / FString::Printf(TEXT("%s-return-%03d.png"),*GetWorld()->GetMapName(),Step);
            FScreenshotRequest::RequestScreenshot(File,true,false,false);
        }
        PreviousStep = Step; PreviousProgress = Progress;
        Waypoints.Reset(); LastNavCheck=Now; LastNavPosition=Pos;
    }
    int32 StopStep = INDEX_NONE;
    FParse::Value(FCommandLine::Get(),TEXT("TibetQAStopStep="),StopStep);
    if (StopStep != INDEX_NONE && Step == StopStep && !FScreenshotRequest::IsScreenshotRequested())
    { Finish(true,TEXT("checkpoint")); return; }
    if (Mode.IsCampaignComplete() && Task == TEXT("Campaign"))
    { Finish(true,TEXT("campaign completed")); return; }

    if (Task == TEXT("Skills") && (bTestingSkills || (Kind == TEXT("Boss") && FVector::Dist2D(Pos,Goal)<900)))
    {
        bTestingSkills = true;
        if (bMoving) { SendKey(PC,EKeys::W,false); bMoving=false; }
        // InputKey queues the bound action. Photograph after PlayerInput and the renderer
        // have processed it, while the short-lived spell meshes are still present.
        if (PendingSkillPhoto != INDEX_NONE)
        {
            if (Now-LastAction >= 0.12 && !FScreenshotRequest::IsScreenshotRequested())
            {
                FScreenshotRequest::RequestScreenshot(Output / FString::Printf(TEXT("skill-%d.png"),PendingSkillPhoto),true,false,false);
                PendingSkillPhoto=INDEX_NONE;
            }
            return;
        }
        if (Now - LastAction < 2.5 || FScreenshotRequest::IsScreenshotRequested()) return;
        const FKey Keys[] = {EKeys::SpaceBar,EKeys::R,EKeys::One,EKeys::Two,EKeys::Three,EKeys::Four,EKeys::T};
        if (NextSkill == UE_ARRAY_COUNT(Keys)) { Finish(true,TEXT("skill inputs")); return; }
        Tapped = Keys[NextSkill];
        PC.SetControlRotation((Goal-Pos).Rotation());
        SendKey(PC,Tapped,true);
        PendingSkillPhoto=NextSkill;
        Record(FString::Printf(TEXT("skillKey\t%d\t%s"),NextSkill,*Tapped.ToString()));
        LastAction = Now;
        ++NextSkill;
        return;
    }
    const bool bFight = Kind == TEXT("Combat") || Kind == TEXT("Boss");
    const double Reach = bFight ? 320 : ((Kind == TEXT("Kora") || Kind == TEXT("Escort") || Kind == TEXT("Reach")) ? 105 : 170);
    if (FVector::Dist2D(Pos,Goal)<Reach) Waypoints.Reset();
    if (Now-LastNavCheck>1.5)
    {
        if (bMoving && FVector::Dist2D(LastNavPosition,Pos)<22 && FVector::Dist2D(Pos,Goal)>Reach)
        {
            Waypoints.Reset();
            FindWalkingPath(*PC.GetPawn(),Goal,Reach);
            Record(FString::Printf(TEXT("detour\t%s\t%d\t%s\t%s\t%d"),
                *GetWorld()->GetMapName(),Step,*Pos.ToCompactString(),*Goal.ToCompactString(),Waypoints.Num()));
        }
        LastNavCheck=Now; LastNavPosition=Pos;
    }
    while (!Waypoints.IsEmpty() && FVector::Dist2D(Waypoints.Last(),Pos)<38) Waypoints.Pop();
    FVector Offset = (Waypoints.IsEmpty() ? Goal : Waypoints.Last())-Pos;
    Offset.Z = 0;
    if (!Offset.IsNearlyZero()) PC.SetControlRotation(Offset.Rotation());
    const bool bWalk = !Waypoints.IsEmpty() || Offset.Size2D() > Reach;
    if (bWalk != bMoving) { SendKey(PC,EKeys::W,bWalk); bMoving=bWalk; }
    if (!bWalk && Now - LastAction >= 0.26 && !FScreenshotRequest::IsScreenshotRequested())
    {
        Tapped = bFight ? EKeys::SpaceBar : EKeys::E;
        SendKey(PC,Tapped,true);
        LastAction=Now;
    }
}
