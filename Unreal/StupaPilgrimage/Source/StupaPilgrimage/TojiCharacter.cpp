#include "TojiCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/SceneComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "Kismet/KismetSystemLibrary.h"
#include "TojiFigures.h"
#include "TojiGameMode.h"

ATojiCharacter::ATojiCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(36, 94);
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0, 600, 0);
    GetCharacterMovement()->MaxWalkSpeed = 520;
    GetCharacterMovement()->JumpZVelocity = 420;

    Figure = CreateDefaultSubobject<USceneComponent>(TEXT("Figure"));
    Figure->SetupAttachment(GetRootComponent());
    Figure->SetRelativeLocation(FVector(0, 0, -94));

    USpringArmComponent* Boom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    Boom->SetupAttachment(GetRootComponent());
    Boom->TargetArmLength = 500;
    Boom->SetRelativeLocation(FVector(0, 0, 68));
    Boom->SocketOffset = FVector(0, 62, 45);
    Boom->bUsePawnControlRotation = true;
    Boom->bDoCollisionTest = true;
    Boom->ProbeSize = 16;

    UCameraComponent* Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(Boom, USpringArmComponent::SocketName);
    Camera->FieldOfView = 78;
}

void ATojiCharacter::BeginPlay()
{
    Super::BeginPlay();
    Trailhead = GetActorLocation();
    TojiFigures::Person(*this, *Figure, true, &Limbs);
}

void ATojiCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (const auto* Player = ::Cast<APlayerController>(Controller))
    {
        const FRotator Yaw(0, Player->GetControlRotation().Yaw, 0);
        const FRotationMatrix Axes(Yaw);
        AddMovementInput(Axes.GetUnitAxis(EAxis::X), Player->IsInputKeyDown(EKeys::W) - Player->IsInputKeyDown(EKeys::S));
        AddMovementInput(Axes.GetUnitAxis(EAxis::Y), Player->IsInputKeyDown(EKeys::D) - Player->IsInputKeyDown(EKeys::A));
    }
    if (GetActorLocation().Z < -550)
    {
        GetCharacterMovement()->StopMovementImmediately();
        TeleportTo(Trailhead, FRotator::ZeroRotator);
    }
    const float Speed = GetVelocity().Size2D();
    WalkTime += DeltaSeconds * Speed * 0.022f;
    GaitWeight = FMath::FInterpTo(GaitWeight, FMath::Clamp(Speed / 520.0f, 0.0f, 1.0f), DeltaSeconds, 10);
    const float Swing = FMath::Sin(WalkTime) * GaitWeight;
    for (int32 Index = 0; Index < Limbs.Num(); ++Index)
    {
        const float Direction = (Index == 0 || Index == 3) ? 1.0f : -1.0f;
        const float Sweep = Index % 2 == 0 ? 19.0f : 13.0f;
        Limbs[Index]->SetRelativeRotation(FRotator(Direction * Swing * Sweep, 0, 0));
    }
}

void ATojiCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxisKey(EKeys::MouseX, this, &APawn::AddControllerYawInput);
    Input->BindAxisKey(EKeys::MouseY, this, &APawn::AddControllerPitchInput);
    Input->BindKey(EKeys::SpaceBar, IE_Pressed, this, &ACharacter::Jump);
    Input->BindKey(EKeys::SpaceBar, IE_Released, this, &ACharacter::StopJumping);
    Input->BindKey(EKeys::E, IE_Pressed, this, &ATojiCharacter::Interact);
    Input->BindKey(EKeys::Q, IE_Pressed, this, &ATojiCharacter::Cast);
    Input->BindKey(EKeys::L, IE_Pressed, this, &ATojiCharacter::ChangeLanguage);
    Input->BindKey(EKeys::I, IE_Pressed, this, &ATojiCharacter::ShowImportFolder);
    Input->BindKey(EKeys::F9, IE_Pressed, this, &ATojiCharacter::Import);
    Input->BindKey(EKeys::One, IE_Pressed, this, &ATojiCharacter::Day);
    Input->BindKey(EKeys::Two, IE_Pressed, this, &ATojiCharacter::Dusk);
    Input->BindKey(EKeys::Three, IE_Pressed, this, &ATojiCharacter::Night);
    Input->BindKey(EKeys::Escape, IE_Pressed, this, &ATojiCharacter::Quit);
}

void ATojiCharacter::Interact()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->Interact(*this);
}

void ATojiCharacter::Cast()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->Cast(*this);
}

void ATojiCharacter::ChangeLanguage()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->ChangeLanguage();
}

void ATojiCharacter::ShowImportFolder()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->ShowImportFolder();
}

void ATojiCharacter::Import()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->ImportFromFolder();
}

void ATojiCharacter::Day()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->SetTimeOfDay(0);
}

void ATojiCharacter::Dusk()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->SetTimeOfDay(1);
}

void ATojiCharacter::Night()
{
    if (auto* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>()) Mode->SetTimeOfDay(2);
}

void ATojiCharacter::Quit()
{
    const bool bInEditor = GetWorld()->WorldType == EWorldType::PIE;
    if (!bInEditor)
    {
        UKismetSystemLibrary::QuitGame(this, ::Cast<APlayerController>(GetController()), EQuitPreference::Quit, false);
    }
}
