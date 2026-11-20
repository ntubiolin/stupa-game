#include "TibetCharacter.h"
#include "TibetCameraBoom.h"
#include "TibetCameraMotion.h"
#include "TibetCameraSettings.h"
#include "TibetGameMode.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerInput.h"
#include "Kismet/KismetSystemLibrary.h"

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

void ATibetCharacter::BeginPlay()
{
    Super::BeginPlay();
    Start = GetActorLocation();
    const TCHAR* Parts[] = {TEXT("Pilgrim"), TEXT("PilgrimLeftLeg"), TEXT("PilgrimLeftSleeve"), TEXT("PilgrimRightLeg"), TEXT("PilgrimRightSleeve")};
    const FVector Pivots[] = {{0,0,0},{0,-12,84},{0,-23,135},{0,12,84},{0,23,135}};
    for (int32 i = 0; i < UE_ARRAY_COUNT(Parts); ++i)
    {
        auto* Joint = NewObject<USceneComponent>(this);
        Joint->SetupAttachment(Figure);
        Joint->SetRelativeLocation(Pivots[i]);
        Joint->RegisterComponent();
        if (i) Joints.Add(Joint);
        auto* Body = NewObject<UStaticMeshComponent>(this);
        Body->SetupAttachment(Joint);
        Body->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, *FString::Printf(TEXT("/Game/Figures/%s.%s"),Parts[i],Parts[i])));
        Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        // FBX imports the Blender forward axis as -Y. Turn it to UE +X, with left limbs on -Y.
        Body->SetRelativeRotation(FRotator(0,90,0));
        Body->RegisterComponent();
    }
}
void ATibetCharacter::Tick(float Dt)
{
    Super::Tick(Dt);
    auto* PC = Cast<APlayerController>(Controller);
    if (!PC) return;
    UpdateMouseLook(*PC);
    const FRotator Yaw(0,PC->GetControlRotation().Yaw,0);
    const FRotationMatrix Axes(Yaw);
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
    AddMovementInput(Axes.GetUnitAxis(EAxis::X),Axis.Y);
    AddMovementInput(Axes.GetUnitAxis(EAxis::Y),Axis.X);
    if (GetActorLocation().Z < -400)
    {
        GetCharacterMovement()->StopMovementImmediately();
        TeleportTo(Start, FRotator::ZeroRotator);
    }
    const float Speed=GetVelocity().Size2D();
    WalkPhase += Dt*Speed*.025;
    for (int32 i=0; i<Joints.Num(); ++i)
    {
        const float Sign = (i == 0 || i == 3) ? 1 : -1;
        Joints[i]->SetRelativeRotation(FRotator(Sign * FMath::Sin(WalkPhase)*19*FMath::Min(Speed/480.f,1.f),0,0));
    }
}
void ATibetCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindKey(EKeys::E,IE_Pressed,this,&ATibetCharacter::DoInteract);
    Input->BindKey(EKeys::L,IE_Pressed,this,&ATibetCharacter::Language);
    Input->BindKey(EKeys::Escape,IE_Pressed,this,&ATibetCharacter::Quit);
    Input->BindKey(EKeys::LeftShift,IE_Pressed,this,&ACharacter::Jump);
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
    if (!PC) return;
    int32 W,H; PC->GetViewportSize(W,H);
    if (Pos.X < W*.5 && MoveFinger < 0) { MoveFinger=Index; Thumb={Pos.X,Pos.Y}; }
    else if (Pos.X >= W*.5 && LookFinger < 0) { LookFinger=Index; Drag={Pos.X,Pos.Y}; }
}
void ATibetCharacter::TouchUp(ETouchIndex::Type Index,FVector)
{
    if(MoveFinger==Index) MoveFinger=-1;
    if(LookFinger==Index) LookFinger=-1;
}
void ATibetCharacter::DoInteract(){if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>()) M->Interact();}
void ATibetCharacter::DoCast(int32 Slot){if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>()) M->CastSkill(Slot);}
void ATibetCharacter::Language(){if(auto* M=GetWorld()->GetAuthGameMode<ATibetGameMode>()) M->ChangeLanguage();}
void ATibetCharacter::Quit(){UKismetSystemLibrary::QuitGame(this,Cast<APlayerController>(Controller),EQuitPreference::Quit,false);}
