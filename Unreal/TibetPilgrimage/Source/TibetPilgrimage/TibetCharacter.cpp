#include "TibetCharacter.h"
#include "TibetCameraBoom.h"
#include "TibetCameraMotion.h"
#include "TibetCameraSettings.h"
#include "TibetGameMode.h"
#include "TibetHUD.h"
#include "TibetPlayOverlay.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerInput.h"

ATibetCharacter::ATibetCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(36, 88);
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0, 620, 0);
    GetCharacterMovement()->MaxWalkSpeed = 570;
    Figure = CreateDefaultSubobject<USceneComponent>(TEXT("Pilgrim"));
    Figure->SetupAttachment(GetRootComponent());
    Figure->SetRelativeLocation(FVector(0,0,-88));
    auto* Arm = CreateDefaultSubobject<UTibetCameraBoom>(TEXT("SpringArm"));
    Arm->SetupAttachment(GetRootComponent());
    Arm->TargetArmLength = 465;
    Arm->SetRelativeLocation(FVector(0,0,80));
    Arm->SocketOffset = FVector(0,45,22);
    Arm->ProbeSize = 16.f;
    auto* Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(Arm, USpringArmComponent::SocketName);
    Camera->bUsePawnControlRotation = true;
    Camera->FieldOfView = 79;
}

void ATibetCharacter::SetPlayerDefaults()
{
    Super::SetPlayerDefaults();
    auto* Player = Cast<APlayerController>(GetController());
    if (!Player || !Player->PlayerCameraManager) return;

    Player->PlayerCameraManager->ViewPitchMin = TibetCamera::MinPitch;
    Player->PlayerCameraManager->ViewPitchMax = TibetCamera::MaxPitch;
    // The player start faces the approach. Frame its skyline once, when spawning.
    Player->SetControlRotation(FRotator(5.f, Player->GetControlRotation().Yaw, 0.f));
}

void ATibetCharacter::UpdateMouseLook(APlayerController& Player)
{
    if (!Player.PlayerInput || Player.IsLookInputIgnored() || !Player.IsInputKeyDown(EKeys::RightMouseButton))
    {
        bAwaitingDragMotion = true;
        return;
    }

    if (Player.WasInputKeyJustPressed(EKeys::RightMouseButton)) bAwaitingDragMotion = true;
    // Slate's raw MouseY is already positive when the mouse moves up. Reading raw counts
    // avoids the extra axis sensitivity, FOV scale and legacy pitch inversion.
    const FVector2D Counts(Player.PlayerInput->GetRawKeyValue(EKeys::MouseX),
        Player.PlayerInput->GetRawKeyValue(EKeys::MouseY));
    if (Counts.IsZero()) return;
    if (bAwaitingDragMotion)
    {
        bAwaitingDragMotion = false;
        int32 Width, Height;
        Player.GetViewportSize(Width, Height);
        // Ignore a cursor recenter on capture, while preserving small first drags.
        if (FMath::Abs(Counts.X) > FMath::Max(160., Width * .35) ||
            FMath::Abs(Counts.Y) > FMath::Max(160., Height * .35)) return;
    }
    TurnView(Player, TibetCamera::MouseDegrees(Counts));
}

void ATibetCharacter::TurnView(APlayerController& Player, FVector2D Degrees)
{
    const auto* Settings = GetDefault<UTibetCameraSettings>();
    Player.SetControlRotation(TibetCamera::Turn(Player.GetControlRotation(), Degrees,
        Settings->GetSensitivity(), Settings->IsVerticalInverted()));
}

FRotator ATibetCharacter::GetViewRotation() const
{
    FRotator View=Super::GetViewRotation();
    View.Yaw=FRotator::NormalizeAxis(View.Yaw+ViewYawOffset);
    return View;
}

void ATibetCharacter::UpdateOrbit(APlayerController& Player, float Dt)
{
    if (Player.IsInputKeyDown(EKeys::RightMouseButton) || LookFinger>=0)
    {
        // Taking over a keyboard orbit with the mouse keeps the currently visible heading.
        if (ViewYawOffset!=0.)
        {
            Player.SetControlRotation(GetViewRotation());
            ViewYawOffset=0.;
        }
        return;
    }

    const bool Left=Player.IsInputKeyDown(EKeys::Q);
    const bool Right=InteractPressedAt>=0. && FPlatformTime::Seconds()-InteractPressedAt>=TibetCamera::InteractHoldSeconds;
    if (Left || Right)
        ViewYawOffset=FRotator::NormalizeAxis(ViewYawOffset+(int(Right)-int(Left))*TibetCamera::OrbitDegreesPerSecond*Dt);
    else if (ViewYawOffset!=0.)
        ViewYawOffset=TibetCamera::FollowYaw(ViewYawOffset,0.,Dt);
}

void ATibetCharacter::UpdateBehindFollow(APlayerController& Player, FVector2D Axis, float Dt)
{
    const bool Left = Player.IsInputKeyDown(EKeys::Q);
    const bool Right = InteractPressedAt >= 0. && FPlatformTime::Seconds() - InteractPressedAt >= TibetCamera::InteractHoldSeconds;
    const bool bManualLook = Player.IsInputKeyDown(EKeys::RightMouseButton) || LookFinger >= 0 || Player.IsLookInputIgnored();
    if (bManualLook || Left || Right)
    {
        bPendingBehindAlign = false;
        return;
    }
    if (ViewYawOffset != 0.) return;

    const double Lateral = FMath::Abs(Axis.X);
    if (Lateral <= TibetCamera::LateralInputDeadzone && Axis.Y < -TibetCamera::LateralInputDeadzone)
    {
        bPendingBehindAlign = false;
        return;
    }
    if (Lateral > TibetCamera::LateralInputDeadzone) bPendingBehindAlign = true;
    if (!bPendingBehindAlign) return;

    FRotator Control = Player.GetControlRotation();
    const double CharacterYaw = GetActorRotation().Yaw;
    Control.Yaw = TibetCamera::AutoBehindYaw(
        Control.Yaw, Axis, CharacterYaw, GetVelocity().Size2D(), Dt, bPendingBehindAlign);
    Player.SetControlRotation(Control);
    if (Lateral <= TibetCamera::LateralInputDeadzone &&
        FMath::Abs(FRotator::NormalizeAxis(CharacterYaw - Control.Yaw)) < .5)
    {
        bPendingBehindAlign = false;
    }
}

void ATibetCharacter::PressInteract()
{
    if (!JournalOpen()) InteractPressedAt=FPlatformTime::Seconds();
}
void ATibetCharacter::ReleaseInteract()
{
    const double Pressed=InteractPressedAt;
    InteractPressedAt=-1.;
    if (Pressed>=0. && FPlatformTime::Seconds()-Pressed<TibetCamera::InteractHoldSeconds) DoInteract();
}

FTibetLimbPose ATibetCharacter::ComputeLimbPose(
    float WalkPhase, float GroundSpeed, bool bFalling, float VerticalVelocity, float LandAlpha)
{
    FTibetLimbPose Pose;
    if (bFalling)
    {
        // In UE (+X Forward, +Y Right, +Z Up), FRotationMatrix(FRotator(Pitch, 0, 0)) maps a downward
        // limb (0, 0, -L) to (+L*sin(Pitch), 0, -L*cos(Pitch)) and an upward torso (0, 0, +H) to
        // (-H*sin(Pitch), 0, +H*cos(Pitch)). Thus +HipPitch raises the thigh forward, -KneePitch bends
        // the shin/boot backward (anatomical knee flexion), +ArmPitch lifts sleeves forward/up, and
        // -TorsoPitch leans the pilgrim forward into the leap.
        if (VerticalVelocity >= 0.f)
        {
            const float Alpha = FMath::SmoothStep(0.f, 260.f, VerticalVelocity);
            Pose.LeftHipPitch = FMath::Lerp(36.f, 46.f, Alpha);
            Pose.LeftKneePitch = FMath::Lerp(-52.f, -68.f, Alpha);
            Pose.RightHipPitch = FMath::Lerp(20.f, 28.f, Alpha);
            Pose.RightKneePitch = FMath::Lerp(-44.f, -54.f, Alpha);
            Pose.LeftArmPitch = FMath::Lerp(28.f, 36.f, Alpha);
            Pose.RightArmPitch = FMath::Lerp(24.f, 28.f, Alpha);
            Pose.TorsoPitch = FMath::Lerp(-5.f, -8.f, Alpha);
        }
        else
        {
            const float Alpha = FMath::SmoothStep(0.f, 260.f, -VerticalVelocity);
            Pose.LeftHipPitch = FMath::Lerp(36.f, 22.f, Alpha);
            Pose.LeftKneePitch = FMath::Lerp(-52.f, -30.f, Alpha);
            Pose.RightHipPitch = FMath::Lerp(20.f, 14.f, Alpha);
            Pose.RightKneePitch = FMath::Lerp(-44.f, -44.f, Alpha);
            Pose.LeftArmPitch = FMath::Lerp(28.f, 18.f, Alpha);
            Pose.RightArmPitch = FMath::Lerp(24.f, 22.f, Alpha);
            Pose.TorsoPitch = FMath::Lerp(-5.f, -3.f, Alpha);
        }
        return Pose;
    }

    const float StrideAlpha = FMath::Clamp(GroundSpeed / 480.f, 0.f, 1.f);
    if (StrideAlpha > 0.f)
    {
        const float LeftSin = FMath::Sin(WalkPhase);
        const float RightSin = -LeftSin;
        const auto StrideKneeFlex = [](float Phase)
        {
            const float Swing = FMath::Max(0.f, FMath::Cos(Phase - 0.45f));
            const float Reach = 0.5f + 0.5f * FMath::Sin(Phase);
            return -FMath::Min(30.f, 22.5f * Swing + 8.5f * Reach);
        };
        Pose.LeftHipPitch = LeftSin * 21.f * StrideAlpha;
        Pose.RightHipPitch = RightSin * 21.f * StrideAlpha;
        Pose.LeftKneePitch = StrideKneeFlex(WalkPhase) * StrideAlpha;
        Pose.RightKneePitch = StrideKneeFlex(WalkPhase + UE_PI) * StrideAlpha;
        Pose.LeftArmPitch = -LeftSin * 19.f * StrideAlpha;
        Pose.RightArmPitch = LeftSin * 19.f * StrideAlpha;
        Pose.TorsoPitch = -2.5f * StrideAlpha;
    }

    const float ClampedLand = FMath::Clamp(LandAlpha, 0.f, 1.f);
    if (ClampedLand > 0.f)
    {
        const float Cushion = FMath::Sin(ClampedLand * UE_PI);
        Pose.LeftHipPitch += 24.f * Cushion;
        Pose.RightHipPitch += 24.f * Cushion;
        Pose.LeftKneePitch = FMath::Clamp(Pose.LeftKneePitch - 42.f * Cushion, -75.f, 0.f);
        Pose.RightKneePitch = FMath::Clamp(Pose.RightKneePitch - 42.f * Cushion, -75.f, 0.f);
        Pose.LeftArmPitch += 14.f * Cushion;
        Pose.RightArmPitch += 14.f * Cushion;
        Pose.TorsoPitch -= 6.f * Cushion;
        Pose.FigureZOffset = -9.f * Cushion;
    }

    return Pose;
}

void ATibetCharacter::Landed(const FHitResult& Hit)
{
    Super::Landed(Hit);
    LandTimer = LandCushionDuration;
}

void ATibetCharacter::BeginPlay()
{
    Super::BeginPlay();
    Start = GetActorLocation();
    StartRotation = GetActorRotation();
    auto AttachPart = [this](USceneComponent* Parent, const FVector& Pivot, const TCHAR* MeshName)
    {
        auto* Joint = NewObject<USceneComponent>(this);
        Joint->SetupAttachment(Parent);
        Joint->SetRelativeLocation(Pivot);
        Joint->RegisterComponent();
        auto* Body = NewObject<UStaticMeshComponent>(this);
        Body->SetupAttachment(Joint);
        Body->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, *FString::Printf(TEXT("/Game/Figures/%s.%s"), MeshName, MeshName)));
        Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        // FBX imports the Blender forward axis as -Y. Turn it to UE +X, with left limbs on -Y.
        Body->SetRelativeRotation(FRotator(0.f, 90.f, 0.f));
        Body->RegisterComponent();
        return Joint;
    };
    AttachPart(Figure, FVector(0.f, 0.f, 0.f), TEXT("Pilgrim"));
    LeftLegJoint = AttachPart(Figure, FVector(0.f, -12.f, 84.f), TEXT("PilgrimLeftLeg"));
    RightLegJoint = AttachPart(Figure, FVector(0.f, 12.f, 84.f), TEXT("PilgrimRightLeg"));
    LeftCalfJoint = AttachPart(LeftLegJoint, FVector(0.f, 0.f, -37.f), TEXT("PilgrimLeftCalf"));
    RightCalfJoint = AttachPart(RightLegJoint, FVector(0.f, 0.f, -37.f), TEXT("PilgrimRightCalf"));
    LeftSleeveJoint = AttachPart(Figure, FVector(0.f, -23.f, 135.f), TEXT("PilgrimLeftSleeve"));
    RightSleeveJoint = AttachPart(Figure, FVector(0.f, 23.f, 135.f), TEXT("PilgrimRightSleeve"));
}
void ATibetCharacter::Tick(float Dt)
{
    Super::Tick(Dt);
    auto* PC = Cast<APlayerController>(Controller);
    if (!PC || JournalOpen()) return;
    UpdateMouseLook(*PC);
    FVector2D Axis(PC->IsInputKeyDown(EKeys::D)-PC->IsInputKeyDown(EKeys::A),
        PC->IsInputKeyDown(EKeys::W)-PC->IsInputKeyDown(EKeys::S));
    bool Down = false;
    FVector2D At;
    int32 W,H;
    PC->GetViewportSize(W,H);
    if (MoveFinger >= 0)
    {
        PC->GetInputTouchState(static_cast<ETouchIndex::Type>(MoveFinger),At.X,At.Y,Down);
        if (Down)
        {
            FVector2D Delta = (At-Thumb)/FMath::Max(32.f,H*.14f);
            Axis += FVector2D(Delta.X,-Delta.Y).GetClampedToMaxSize(1);
        }
    }
    if (LookFinger >= 0)
    {
        PC->GetInputTouchState(static_cast<ETouchIndex::Type>(LookFinger),At.X,At.Y,Down);
        if (Down && H>0 && !PC->IsLookInputIgnored())
        {
            const FVector2D Delta = (At-Drag)/H;
            if (!Delta.IsZero()) TurnView(*PC, FVector2D(Delta.X*95., -Delta.Y*80.));
            Drag=At;
        }
    }
    Axis=Axis.GetClampedToMaxSize(1);
    UpdateOrbit(*PC, Dt);
    const FRotationMatrix Axes(FRotator(0,PC->GetControlRotation().Yaw,0));
    AddMovementInput(Axes.GetUnitAxis(EAxis::X),Axis.Y);
    AddMovementInput(Axes.GetUnitAxis(EAxis::Y),Axis.X);
    UpdateBehindFollow(*PC, Axis, Dt);
    if (GetActorLocation().Z < -400) RespawnAtStart();
    const FVector Velocity = GetVelocity();
    const float Speed = Velocity.Size2D();
    const bool bFalling = GetCharacterMovement() && GetCharacterMovement()->IsFalling();
    if (!bFalling)
    {
        WalkPhase += Dt * Speed * .025f;
        LandTimer = FMath::Max(0.f, LandTimer - Dt);
    }
    else
    {
        LandTimer = 0.f;
    }
    const float LandAlpha = bFalling ? 0.f : (LandTimer / LandCushionDuration);
    const FTibetLimbPose TargetPose = ComputeLimbPose(WalkPhase, Speed, bFalling, Velocity.Z, LandAlpha);
    constexpr float InterpSpeed = 16.f;
    CurrentPose.LeftHipPitch = FMath::FInterpTo(CurrentPose.LeftHipPitch, TargetPose.LeftHipPitch, Dt, InterpSpeed);
    CurrentPose.RightHipPitch = FMath::FInterpTo(CurrentPose.RightHipPitch, TargetPose.RightHipPitch, Dt, InterpSpeed);
    CurrentPose.LeftKneePitch = FMath::FInterpTo(CurrentPose.LeftKneePitch, TargetPose.LeftKneePitch, Dt, InterpSpeed);
    CurrentPose.RightKneePitch = FMath::FInterpTo(CurrentPose.RightKneePitch, TargetPose.RightKneePitch, Dt, InterpSpeed);
    CurrentPose.LeftArmPitch = FMath::FInterpTo(CurrentPose.LeftArmPitch, TargetPose.LeftArmPitch, Dt, InterpSpeed);
    CurrentPose.RightArmPitch = FMath::FInterpTo(CurrentPose.RightArmPitch, TargetPose.RightArmPitch, Dt, InterpSpeed);
    CurrentPose.TorsoPitch = FMath::FInterpTo(CurrentPose.TorsoPitch, TargetPose.TorsoPitch, Dt, InterpSpeed);
    CurrentPose.FigureZOffset = FMath::FInterpTo(CurrentPose.FigureZOffset, TargetPose.FigureZOffset, Dt, InterpSpeed);

    float Recoil = 0.f;
    if (const auto* Mode = GetWorld()->GetAuthGameMode<ATibetGameMode>())
        Recoil = Mode->GetPlayerFeedback().Flinch(GetWorld()->GetTimeSeconds());
    // Move the figure within its capsule. The camera and collision stay steady.
    Figure->SetRelativeLocation(FVector(0.f, 0.f, -88.f + CurrentPose.FigureZOffset));
    Figure->SetRelativeRotation(FRotator(CurrentPose.TorsoPitch - 22.f * Recoil, 0.f, 9.f * Recoil));
    if (LeftLegJoint) LeftLegJoint->SetRelativeRotation(FRotator(CurrentPose.LeftHipPitch, 0.f, 0.f));
    if (RightLegJoint) RightLegJoint->SetRelativeRotation(FRotator(CurrentPose.RightHipPitch, 0.f, 0.f));
    if (LeftCalfJoint) LeftCalfJoint->SetRelativeRotation(FRotator(CurrentPose.LeftKneePitch, 0.f, 0.f));
    if (RightCalfJoint) RightCalfJoint->SetRelativeRotation(FRotator(CurrentPose.RightKneePitch, 0.f, 0.f));
    if (LeftSleeveJoint) LeftSleeveJoint->SetRelativeRotation(FRotator(CurrentPose.LeftArmPitch, 0.f, 0.f));
    if (RightSleeveJoint) RightSleeveJoint->SetRelativeRotation(FRotator(CurrentPose.RightArmPitch, 0.f, 0.f));
}
void ATibetCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindKey(EKeys::F,IE_Pressed,this,&ATibetCharacter::FeedMonkey);
    Input->BindKey(EKeys::E,IE_Pressed,this,&ATibetCharacter::PressInteract);
    Input->BindKey(EKeys::E,IE_Released,this,&ATibetCharacter::ReleaseInteract);
    Input->BindKey(EKeys::L,IE_Pressed,this,&ATibetCharacter::Language);
    Input->BindKey(EKeys::M,IE_Pressed,this,&ATibetCharacter::OpenMap).bExecuteWhenPaused=true;
    Input->BindKey(EKeys::I,IE_Pressed,this,&ATibetCharacter::OpenPack).bExecuteWhenPaused=true;
    Input->BindKey(EKeys::X,IE_Pressed,this,&ATibetCharacter::UseQuickSlot);
    Input->BindKey(EKeys::K,IE_Pressed,this,&ATibetCharacter::OpenSkills).bExecuteWhenPaused=true;
    Input->BindKey(EKeys::Escape,IE_Pressed,this,&ATibetCharacter::ToggleMenu).bExecuteWhenPaused=true;
    Input->BindKey(EKeys::LeftShift,IE_Pressed,this,&ATibetCharacter::TryJump);
    Input->BindTouch(IE_Pressed,this,&ATibetCharacter::TouchDown);
    Input->BindTouch(IE_Released,this,&ATibetCharacter::TouchUp);
    const FKey Keys[] = {EKeys::SpaceBar,EKeys::R,EKeys::One,EKeys::Two,EKeys::Three,EKeys::Four,EKeys::T};
    for (int32 i=0;i<UE_ARRAY_COUNT(Keys);++i)
    {
        FInputKeyBinding Binding(FInputChord(Keys[i]),IE_Pressed);
        Binding.KeyDelegate.GetDelegateForManualSet().BindLambda([this,i](){DoCast(i);});
        Input->KeyBindings.Add(MoveTemp(Binding));
    }
}
void ATibetCharacter::TouchDown(ETouchIndex::Type Index,FVector Pos)
{
    auto* PC=Cast<APlayerController>(Controller);
    if (!PC || JournalOpen()) return;
    int32 W,H; PC->GetViewportSize(W,H);
    if (Pos.X < W*.5 && MoveFinger < 0) { MoveFinger=Index; Thumb={Pos.X,Pos.Y}; }
    else if (Pos.X >= W*.5 && LookFinger < 0) { LookFinger=Index; Drag={Pos.X,Pos.Y}; }
}
void ATibetCharacter::TouchUp(ETouchIndex::Type Index,FVector)
{
    if(MoveFinger==Index) MoveFinger=-1;
    if(LookFinger==Index) LookFinger=-1;
}
bool ATibetCharacter::JournalOpen() const
{
    const auto* PC=Cast<APlayerController>(Controller);
    const auto* HUD=PC ? Cast<ATibetHUD>(PC->GetHUD()) : nullptr;
    const auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    return (HUD && HUD->IsJournalOpen()) || (Mode && Mode->FeedingPanel()!=0);
}
void ATibetCharacter::CancelGameplayInput()
{
    // Flush may synthesize an E release. Cancel the gesture before flushing.
    InteractPressedAt=-1.;
    bPendingBehindAlign=false;
    MoveFinger=LookFinger=-1;
    bAwaitingDragMotion=true;
    StopJumping();
    ConsumeMovementInputVector();
    GetCharacterMovement()->StopMovementImmediately();
    auto* PC=Cast<APlayerController>(Controller);
    if (PC && PC->PlayerInput) PC->PlayerInput->FlushPressedKeys();
}
void ATibetCharacter::RespawnAtStart()
{
    LandTimer = 0.f;
    bPendingBehindAlign = false;
    ViewYawOffset = 0.;
    CurrentPose = FTibetLimbPose{};
    if (auto* Move = GetCharacterMovement()) Move->StopMovementImmediately();
    TeleportTo(Start, StartRotation);
}
void ATibetCharacter::OpenMap()
{
    if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>(); M && M->FeedingPanel()) return;
    if (auto* HUD=Cast<ATibetHUD>(GetController<APlayerController>()->GetHUD())) HUD->ToggleJournal(ETibetPage::Map);
}
void ATibetCharacter::OpenPack()
{
    if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>(); M && M->FeedingPanel()) return;
    if (auto* HUD=Cast<ATibetHUD>(GetController<APlayerController>()->GetHUD())) HUD->ToggleJournal(ETibetPage::Pack);
}
void ATibetCharacter::UseQuickSlot()
{
    if (auto* HUD=Cast<ATibetHUD>(GetController<APlayerController>()->GetHUD())) HUD->UseQuickSlot();
}
void ATibetCharacter::OpenSkills()
{
    if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>(); M && M->FeedingPanel()) return;
    if (auto* HUD=Cast<ATibetHUD>(GetController<APlayerController>()->GetHUD())) HUD->ToggleJournal(ETibetPage::Skills);
}
void ATibetCharacter::ToggleMenu()
{
    auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if(M && M->FeedingPanel()!=0) { M->CloseFeeding(); return; }
    if (auto* HUD=Cast<ATibetHUD>(GetController<APlayerController>()->GetHUD()))
    {
        if (HUD->IsJournalOpen()) HUD->CloseJournal();
        else HUD->ToggleJournal(ETibetPage::Controls);
    }
}
void ATibetCharacter::TryJump()
{
    if (!JournalOpen()) Jump();
}
void ATibetCharacter::FeedMonkey()
{
    auto* PC=GetController<APlayerController>();
    auto* HUD=PC?Cast<ATibetHUD>(PC->GetHUD()):nullptr;
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if(Mode && HUD && !HUD->IsJournalOpen()) Mode->QuickPractice();
}
void ATibetCharacter::DoInteract()
{
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (Mode && !JournalOpen()) Mode->Interact();
}
void ATibetCharacter::DoCast(int32 Slot)
{
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if(Mode && Mode->FeedingPanel()==2 && Slot>=2 && Slot<=4) { Mode->PickFruit(Slot-2); return; }
    if (Mode && !JournalOpen()) Mode->CastSkill(Slot);
}
void ATibetCharacter::Language()
{
    auto* Mode=GetWorld()->GetAuthGameMode<ATibetGameMode>();
    if (Mode && !JournalOpen()) Mode->ChangeLanguage();
}
